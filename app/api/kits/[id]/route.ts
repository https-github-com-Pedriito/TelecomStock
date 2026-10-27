import { NextRequest } from 'next/server';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Kit } from '@/entities/Kit';
import { KitLigne } from '@/entities/KitLigne';
import { Article } from '@/entities/Article';
import { UserRole } from '@/entities/User';
import { publishChange } from '@/lib/realtime';
import { normalizeKitCode } from '@/lib/kits';
import { chargerLignesDuKit } from '@/lib/kitsRepo';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_request, auth, { params }) => {
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const db = await getDb();
  const kit = await chargerLignesDuKit(
    db,
    await db.getRepository(Kit).findOne({ where: tenantId ? { id, tenant_id: tenantId } : { id } })
  );
  if (!kit) return Response.json({ message: 'Kit introuvable' }, { status: 404 });
  return Response.json(kit);
});

export const PUT = withAuth<Ctx>(async (request: NextRequest, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const { id } = await params;

  const db = await getDb();
  const kitRepo = db.getRepository(Kit);
  const kit = await kitRepo.findOne({ where: tenantId ? { id, tenant_id: tenantId } : { id } });
  if (!kit) return Response.json({ message: 'Kit introuvable' }, { status: 404 });

  const body = await request.json();

  if (body.code !== undefined) {
    const code = normalizeKitCode(body.code);
    if (!code) return Response.json({ message: 'Le code du kit est requis' }, { status: 400 });
    if (code !== kit.code) {
      const doublon = await kitRepo.findOne({ where: { tenant_id: kit.tenant_id, code } });
      if (doublon) {
        return Response.json({ message: `Le code ${code} est déjà utilisé par un autre kit` }, { status: 409 });
      }
    }
    kit.code = code;
  }
  if (body.nom !== undefined) kit.nom = body.nom;
  if (body.description !== undefined) kit.description = body.description;
  if (body.est_actif !== undefined) kit.est_actif = Boolean(body.est_actif);

  await kitRepo.save(kit);

  // La nomenclature est remplacée en bloc : l'écran d'édition renvoie toujours
  // l'ensemble des lignes, un diff ligne à ligne n'apporterait rien ici.
  if (Array.isArray(body.lignes)) {
    const lignes: { article_id: string; quantite: number }[] = [];
    for (const l of body.lignes) {
      const article_id = String(l?.article_id ?? '').trim();
      const quantite = Number(l?.quantite);
      if (!article_id) return Response.json({ message: 'Chaque ligne doit référencer un article' }, { status: 400 });
      if (!Number.isInteger(quantite) || quantite <= 0) {
        return Response.json({ message: 'Chaque ligne doit avoir une quantité entière strictement positive' }, { status: 400 });
      }
      lignes.push({ article_id, quantite });
    }
    if (lignes.length === 0) {
      return Response.json({ message: 'Un kit doit contenir au moins un composant' }, { status: 400 });
    }

    const articles = await db.getRepository(Article).find({ where: { tenant_id: kit.tenant_id } });
    const connus = new Set(articles.map(a => a.id));
    const inconnu = lignes.find(l => !connus.has(l.article_id));
    if (inconnu) {
      return Response.json({ message: `Article inconnu dans la nomenclature : ${inconnu.article_id}` }, { status: 400 });
    }

    // Remplacement en transaction : entre le DELETE et le SAVE, le kit n'a plus
    // aucune ligne. Une panne a cet instant hors transaction laisserait une
    // nomenclature vide, donc un kit qui ne deduit plus rien du stock.
    await db.transaction(async manager => {
      const ligneRepo = manager.getRepository(KitLigne);
      await ligneRepo.delete({ kit_id: kit.id });
      await ligneRepo.save(lignes.map(l => ligneRepo.create({ kit_id: kit.id, ...l })));
    });
  }

  const complet = await chargerLignesDuKit(db, await kitRepo.findOne({ where: { id: kit.id } }));
  await publishChange(kit.tenant_id, 'kit', 'update', complet ?? kit);
  return Response.json(complet ?? kit);
});

export const DELETE = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN);
  const tenantId = requireTenant(auth);
  const { id } = await params;

  const db = await getDb();
  const kitRepo = db.getRepository(Kit);
  const kit = await kitRepo.findOne({ where: tenantId ? { id, tenant_id: tenantId } : { id } });
  if (!kit) return Response.json({ message: 'Kit introuvable' }, { status: 404 });

  // Les lignes sont supprimées explicitement : la cascade SQL n'est posée que
  // si `synchronize` a bien créé la contrainte, ce qui n'est pas garanti sur
  // une base déjà existante. En transaction pour ne pas laisser de lignes
  // orphelines si la suppression du kit échoue.
  await db.transaction(async manager => {
    await manager.getRepository(KitLigne).delete({ kit_id: kit.id });
    await manager.getRepository(Kit).remove(kit);
  });
  await publishChange(kit.tenant_id, 'kit', 'delete', { id });
  return new Response(null, { status: 204 });
});

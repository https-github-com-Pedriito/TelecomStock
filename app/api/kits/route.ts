import { NextRequest } from 'next/server';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Kit } from '@/entities/Kit';
import { KitLigne } from '@/entities/KitLigne';
import { Article } from '@/entities/Article';
import { UserRole } from '@/entities/User';
import { publishChange } from '@/lib/realtime';
import { normalizeKitCode } from '@/lib/kits';
import { chargerLignesDesKits, chargerLignesDuKit } from '@/lib/kitsRepo';

/** Valide et normalise les lignes de nomenclature reçues du client. */
function parseLignes(body: any): { article_id: string; quantite: number }[] | string {
  const raw = Array.isArray(body?.lignes) ? body.lignes : [];
  if (raw.length === 0) return 'Un kit doit contenir au moins un composant';

  const lignes: { article_id: string; quantite: number }[] = [];
  for (const l of raw) {
    const article_id = String(l?.article_id ?? '').trim();
    const quantite = Number(l?.quantite);
    if (!article_id) return 'Chaque ligne doit référencer un article';
    if (!Number.isInteger(quantite) || quantite <= 0) {
      return 'Chaque ligne doit avoir une quantité entière strictement positive';
    }
    lignes.push({ article_id, quantite });
  }
  return lignes;
}

export const GET = withAuth(async (_request, auth) => {
  const tenantId = requireTenant(auth);
  const db = await getDb();
  const kits = await db.getRepository(Kit).find({
    where: tenantId ? { tenant_id: tenantId } : {},
    order: { code: 'ASC' },
  });
  await chargerLignesDesKits(db, kits);
  return Response.json(kits);
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  if (!tenantId) return Response.json({ message: 'Aucun tenant sélectionné' }, { status: 403 });

  const body = await request.json();
  const code = normalizeKitCode(body?.code ?? '');
  if (!code) return Response.json({ message: 'Le code du kit est requis' }, { status: 400 });
  if (!body?.nom) return Response.json({ message: 'Le nom du kit est requis' }, { status: 400 });

  const lignes = parseLignes(body);
  if (typeof lignes === 'string') return Response.json({ message: lignes }, { status: 400 });

  const db = await getDb();
  const kitRepo = db.getRepository(Kit);

  const existant = await kitRepo.findOne({ where: { tenant_id: tenantId, code } });
  if (existant) {
    return Response.json({ message: `Le code ${code} est déjà utilisé par un autre kit` }, { status: 409 });
  }

  // Les articles référencés doivent appartenir au même tenant : sans ce
  // contrôle, une nomenclature pourrait décrémenter le stock d'un autre client.
  const articleRepo = db.getRepository(Article);
  const articles = await articleRepo.find({ where: { tenant_id: tenantId } });
  const connus = new Set(articles.map(a => a.id));
  const inconnu = lignes.find(l => !connus.has(l.article_id));
  if (inconnu) {
    return Response.json({ message: `Article inconnu dans la nomenclature : ${inconnu.article_id}` }, { status: 400 });
  }

  // Kit et nomenclature dans la meme transaction : un kit enregistre sans ses
  // lignes serait scannable tout en ne deduisant rien du stock.
  const saved = await db.transaction(async manager => {
    const txKitRepo = manager.getRepository(Kit);
    const ligneRepo = manager.getRepository(KitLigne);
    const cree = await txKitRepo.save(
      txKitRepo.create({
        tenant_id: tenantId,
        code,
        nom: body.nom,
        description: body.description,
        est_actif: body.est_actif ?? true,
      })
    );
    await ligneRepo.save(lignes.map(l => ligneRepo.create({ kit_id: cree.id, ...l })));
    return cree;
  });

  const complet = await chargerLignesDuKit(db, await kitRepo.findOne({ where: { id: saved.id } }));
  await publishChange(tenantId, 'kit', 'create', complet ?? saved);
  return Response.json(complet ?? saved, { status: 201 });
});

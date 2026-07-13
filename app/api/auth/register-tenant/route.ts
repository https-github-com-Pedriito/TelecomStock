import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { Tenant } from '@/entities/Tenant';
import { User, UserRole } from '@/entities/User';
import bcryptjs from 'bcryptjs';
import { sendTenantWelcomeEmail } from '@/lib/mailer';

// Self-service registration — crée le tenant + l'admin initial
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom_societe, slug, contact_email, admin_nom, admin_prenom, admin_email } = body;

    if (!nom_societe || !slug || !admin_email || !admin_nom || !admin_prenom) {
      return Response.json({ message: 'Tous les champs sont requis' }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return Response.json({ message: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets' }, { status: 400 });
    }

    const db = await getDb();

    const existing = await db.getRepository(Tenant).findOne({ where: { slug } });
    if (existing) return Response.json({ message: 'Ce nom d\'entreprise est déjà utilisé' }, { status: 409 });

    const existingUser = await db.getRepository(User).findOne({ where: { email: admin_email } });
    if (existingUser) return Response.json({ message: 'Cet email est déjà associé à un compte' }, { status: 409 });

    const tenant = db.getRepository(Tenant).create({
      nom: nom_societe,
      slug,
      contact_email: contact_email || admin_email,
      is_active: true,
    });
    await db.getRepository(Tenant).save(tenant);

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!';
    const password_hash = await bcryptjs.hash(tempPassword, 10);

    const admin = db.getRepository(User).create({
      tenant_id: tenant.id,
      email: admin_email,
      password_hash,
      nom: admin_nom,
      prenom: admin_prenom,
      role: UserRole.ADMIN,
      is_active: true,
    });
    await db.getRepository(User).save(admin);

    try {
      await sendTenantWelcomeEmail(admin_email, nom_societe, admin_email, tempPassword);
    } catch (e) {
      console.error('Erreur envoi email:', e);
    }

    return Response.json({ message: 'Compte créé. Vérifiez votre email pour vos identifiants.' }, { status: 201 });
  } catch (error) {
    console.error('register-tenant error:', error);
    return Response.json({ message: 'Erreur lors de la création du compte' }, { status: 500 });
  }
}

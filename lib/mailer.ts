import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resend) resend = new Resend(apiKey);
  return resend;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || 'TelecomStock <onboarding@resend.dev>';
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#2563eb;padding:28px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.02em;">Telecom Stock</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#0f172a;">${title}</h1>
                <div style="font-size:14px;line-height:1.6;color:#334155;">${bodyHtml}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <span style="font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Telecom Stock. Tous droits réservés.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function credentialsBlock(label: string, value: string): string {
  return `<div style="margin-top:6px;padding:12px 16px;background-color:#f1f5f9;border-radius:12px;font-size:13px;">
    <span style="color:#64748b;">${label} :</span> <strong style="color:#0f172a;">${value}</strong>
  </div>`;
}

export async function sendPasswordResetRequestEmail(userEmail: string): Promise<void> {
  const client = getResend();
  const adminEmail = process.env.ADMIN_RESET_EMAIL;
  if (!client || !adminEmail) {
    console.warn('RESEND_API_KEY ou ADMIN_RESET_EMAIL non configuré — email non envoyé');
    return;
  }
  await client.emails.send({
    from: getFromAddress(),
    to: adminEmail,
    subject: 'Telecom Stock — Demande de réinitialisation de mot de passe',
    html: emailShell(
      'Demande de réinitialisation',
      `<p>L'utilisateur <strong>${userEmail}</strong> a demandé une réinitialisation de mot de passe le ${new Date().toLocaleString('fr-FR')}.</p>
       <p>Connectez-vous à la gestion des utilisateurs pour lui définir un nouveau mot de passe.</p>`
    ),
  });
}

export async function sendTenantWelcomeEmail(
  contactEmail: string,
  tenantNom: string,
  adminEmail: string,
  tempPassword: string
): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn('RESEND_API_KEY non configuré — email de bienvenue non envoyé');
    return;
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  await client.emails.send({
    from: getFromAddress(),
    to: contactEmail,
    subject: `Bienvenue sur Telecom Stock — ${tenantNom}`,
    html: emailShell(
      'Votre espace est prêt 🎉',
      `<p>Bonjour,</p>
       <p>Votre espace Telecom Stock pour <strong>${tenantNom}</strong> a été créé avec succès.</p>
       ${credentialsBlock('Email', adminEmail)}
       ${credentialsBlock('Mot de passe temporaire', tempPassword)}
       <p style="margin-top:20px;">Merci de changer votre mot de passe dès votre première connexion.</p>
       <a href="${baseUrl}/login" style="display:inline-block;margin-top:12px;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">Se connecter</a>`
    ),
  });
}

export async function sendPaymentFailedEmail(
  contactEmail: string,
  tenantNom: string,
  portalUrl: string | null
): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn('RESEND_API_KEY non configuré — email paiement échoué non envoyé');
    return;
  }
  await client.emails.send({
    from: getFromAddress(),
    to: contactEmail,
    subject: `Échec de paiement — ${tenantNom}`,
    html: emailShell(
      'Le paiement a échoué ⚠️',
      `<p>Bonjour,</p>
       <p>Le paiement de l'abonnement de <strong>${tenantNom}</strong> sur Telecom Stock n'a pas pu être traité.</p>
       <p>Stripe retentera automatiquement le prélèvement. Pour éviter toute interruption de service, merci de vérifier vos informations de paiement dès que possible.</p>
       ${portalUrl ? `<a href="${portalUrl}" style="display:inline-block;margin-top:12px;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">Mettre à jour mon moyen de paiement</a>` : ''}`
    ),
  });
}

export async function sendTeamMemberWelcomeEmail(
  email: string,
  tenantNom: string,
  tempPassword: string
): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn('RESEND_API_KEY non configuré — email de bienvenue équipe non envoyé');
    return;
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  await client.emails.send({
    from: getFromAddress(),
    to: email,
    subject: `Votre accès Telecom Stock — ${tenantNom}`,
    html: emailShell(
      'Votre compte a été créé 🎉',
      `<p>Bonjour,</p>
       <p>Un compte vient d'être créé pour vous sur l'espace <strong>${tenantNom}</strong> de Telecom Stock.</p>
       ${credentialsBlock('Email', email)}
       ${credentialsBlock('Mot de passe temporaire', tempPassword)}
       <p style="margin-top:20px;">Merci de changer votre mot de passe dès votre première connexion.</p>
       <a href="${baseUrl}/login" style="display:inline-block;margin-top:12px;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">Se connecter</a>`
    ),
  });
}

export async function sendPasswordChangedEmail(email: string): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn('RESEND_API_KEY non configuré — email changement mot de passe non envoyé');
    return;
  }
  await client.emails.send({
    from: getFromAddress(),
    to: email,
    subject: 'Telecom Stock — Votre mot de passe a été modifié',
    html: emailShell(
      'Mot de passe modifié 🔒',
      `<p>Bonjour,</p>
       <p>Le mot de passe de votre compte Telecom Stock (<strong>${email}</strong>) vient d'être modifié, le ${new Date().toLocaleString('fr-FR')}.</p>
       <p>Si vous n'êtes pas à l'origine de cette action, contactez immédiatement votre administrateur.</p>`
    ),
  });
}

export async function sendStockAlertEmail(
  recipients: string[],
  tenantNom: string,
  articleNom: string,
  quantite: number,
  niveau: 'critique' | 'rupture'
): Promise<void> {
  const client = getResend();
  if (!client || recipients.length === 0) {
    if (!client) console.warn('RESEND_API_KEY non configuré — email alerte stock non envoyé');
    return;
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const isRupture = niveau === 'rupture';
  await client.emails.send({
    from: getFromAddress(),
    to: recipients,
    subject: `${isRupture ? '🔴 Rupture de stock' : '⚠️ Stock critique'} — ${articleNom} (${tenantNom})`,
    html: emailShell(
      isRupture ? 'Rupture de stock' : 'Stock critique',
      `<p>Bonjour,</p>
       <p>L'article <strong>${articleNom}</strong> ${
         isRupture
           ? 'est en <strong>rupture de stock</strong> (0 unité disponible).'
           : `a atteint un niveau de stock critique : <strong>${quantite} unité(s)</strong> restante(s).`
       }</p>
       <p style="margin-top:20px;">Pensez à réapprovisionner dès que possible.</p>
       <a href="${baseUrl}/articles" style="display:inline-block;margin-top:12px;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">Voir les articles</a>`
    ),
  });
}

export async function sendSubscriptionCanceledEmail(
  contactEmail: string,
  tenantNom: string
): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn('RESEND_API_KEY non configuré — email de résiliation non envoyé');
    return;
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  await client.emails.send({
    from: getFromAddress(),
    to: contactEmail,
    subject: `Abonnement résilié — ${tenantNom}`,
    html: emailShell(
      'Votre abonnement a été résilié',
      `<p>Bonjour,</p>
       <p>L'abonnement Telecom Stock de <strong>${tenantNom}</strong> a bien été résilié. Votre espace est désormais désactivé.</p>
       <p>Vous pouvez souscrire à nouveau à tout moment depuis notre page tarifs.</p>
       <a href="${baseUrl}/pricing" style="display:inline-block;margin-top:12px;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">Voir les offres</a>`
    ),
  });
}

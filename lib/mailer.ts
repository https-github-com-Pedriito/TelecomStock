import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendPasswordResetRequestEmail(userEmail: string): Promise<void> {
  const adminEmail = process.env.ADMIN_RESET_EMAIL;
  if (!adminEmail || !process.env.SMTP_HOST) {
    console.warn('ADMIN_RESET_EMAIL ou SMTP_HOST non configuré — email non envoyé');
    return;
  }
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: adminEmail,
    subject: 'TelecomStock - Demande de réinitialisation de mot de passe',
    text: `L'utilisateur ${userEmail} a demandé une réinitialisation de mot de passe le ${new Date().toLocaleString('fr-FR')}.\n\nConnectez-vous à la gestion des utilisateurs pour lui définir un nouveau mot de passe.`,
  });
}

export async function sendTenantWelcomeEmail(
  contactEmail: string,
  tenantNom: string,
  adminEmail: string,
  tempPassword: string
): Promise<void> {
  if (!process.env.SMTP_HOST) return;
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: contactEmail,
    subject: `Bienvenue sur TelecomStock — ${tenantNom}`,
    text: `Bonjour,\n\nVotre espace TelecomStock pour ${tenantNom} a été créé.\n\nIdentifiants administrateur :\nEmail : ${adminEmail}\nMot de passe temporaire : ${tempPassword}\n\nChangez votre mot de passe dès la première connexion.\n\nL'équipe TelecomStock`,
  });
}

import type { DataSource } from 'typeorm';
import { Article } from '@/entities/Article';
import { Tenant } from '@/entities/Tenant';
import { User, UserRole } from '@/entities/User';
import { mergeRecipients } from '@/lib/alertEmails';
import { sendStockAlertEmail } from '@/lib/mailer';
import { getStockLevel } from '@/lib/stock';

/**
 * Envoie une alerte e-mail aux admins et managers du tenant, ainsi qu'aux
 * adresses supplémentaires qu'il a configurées (2 max), pour chaque article
 * passé sous son seuil minimum.
 *
 * Partagé entre la sortie d'un article seul (POST /api/mouvements) et la sortie
 * d'un kit, qui touche plusieurs articles d'un coup : les destinataires et le
 * tenant ne sont alors chargés qu'une fois.
 *
 * Ne lève jamais : une alerte qui échoue ne doit pas annuler un mouvement de
 * stock déjà enregistré.
 */
export async function notifyStockAlerts(
  db: DataSource,
  tenantId: string,
  articles: Article[]
): Promise<void> {
  const enAlerte = articles.filter(
    a => getStockLevel(a.quantite_stock, a.seuil_minimum) !== 'ok'
  );
  if (enAlerte.length === 0) return;

  try {
    const [tenant, recipients] = await Promise.all([
      db.getRepository(Tenant).findOne({ where: { id: tenantId } }),
      db.getRepository(User).find({
        where: [
          { tenant_id: tenantId, role: UserRole.ADMIN, is_active: true },
          { tenant_id: tenantId, role: UserRole.MANAGER, is_active: true },
        ],
      }),
    ]);

    const emails = mergeRecipients(
      recipients.map(u => u.email).filter(Boolean),
      tenant?.alert_emails ?? []
    );
    if (!tenant || emails.length === 0) return;

    for (const article of enAlerte) {
      const niveau = getStockLevel(article.quantite_stock, article.seuil_minimum);
      if (niveau === 'ok') continue;
      await sendStockAlertEmail(emails, tenant.nom, article.nom, article.quantite_stock, niveau);
    }
  } catch (e) {
    console.error('Erreur envoi email alerte stock:', e);
  }
}

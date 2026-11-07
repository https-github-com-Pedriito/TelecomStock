import { after } from 'next/server';

/**
 * Execute une tache apres l'envoi de la reponse (diffusion temps reel, e-mails
 * d'alerte) pour qu'elle n'allonge pas le temps de reponse percu par
 * l'utilisateur. Sur Vercel, `after` maintient la fonction en vie jusqu'a la
 * fin de la tache.
 *
 * Hors d'une requete Next (tests unitaires, scripts), `after` leve : la tache
 * est alors simplement attendue. Elle ne leve jamais.
 */
export async function runAfterResponse(task: () => Promise<unknown>): Promise<void> {
  const safe = async () => {
    try {
      await task();
    } catch (err) {
      console.error('Tache post-reponse en echec :', err);
    }
  };
  try {
    after(safe);
  } catch {
    await safe();
  }
}

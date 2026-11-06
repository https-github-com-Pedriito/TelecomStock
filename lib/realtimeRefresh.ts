export interface RefreshTargets {
  articles: boolean;
  mouvements: boolean;
  fournisseurs: boolean;
}

/**
 * Donnees a recharger pour un evenement temps reel.
 *
 * Le serveur publie les noms de table au singulier (`article`, `mouvement`) ;
 * le client n'ecoutait que le pluriel et ignorait donc tous les evenements.
 * Les deux graphies sont acceptees. Un mouvement change aussi le stock des
 * articles : on recharge les deux.
 */
export function refreshTargets(table: string): RefreshTargets {
  const name = table.toLowerCase();
  const isMouvement = name === 'mouvement' || name === 'mouvements';
  return {
    articles: isMouvement || name === 'article' || name === 'articles',
    mouvements: isMouvement,
    fournisseurs: name === 'fournisseur' || name === 'fournisseurs',
  };
}

export type StockLevel = 'ok' | 'critique' | 'rupture';

export function getStockLevel(quantite: number, seuilMinimum: number): StockLevel {
  if (quantite <= 0) return 'rupture';
  if (quantite <= seuilMinimum) return 'critique';
  return 'ok';
}

export function isStockAlertable(quantite: number, seuilMinimum: number): boolean {
  return getStockLevel(quantite, seuilMinimum) !== 'ok';
}

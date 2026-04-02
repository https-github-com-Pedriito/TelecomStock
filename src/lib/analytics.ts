import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Vérifier si l'utilisateur a donné son consentement
function hasConsent(): boolean {
  return localStorage.getItem('telecomstock-cookie-consent') === 'accepted';
}

// Tracker la création d'un inventaire
export function trackCreateInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({
    action: 'create_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}

// Tracker la modification d'un inventaire
export function trackUpdateInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({
    action: 'update_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}

// Tracker la suppression d'un inventaire
export function trackDeleteInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({
    action: 'delete_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}

// Tracker la validation d'un inventaire
export function trackValidateInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({
    action: 'validate_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}

// Tracker l'export d'un inventaire
export function trackExportInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({
    action: 'export_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}
// src/lib/analytics.ts


export function initAnalytics() {
  if (!hasConsent() || !GA_MEASUREMENT_ID) return;
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

export function trackPageView(path: string) {
  if (!hasConsent()) return;
  ReactGA.send({ hitType: "pageview", page: path });
}


export function trackEvent(action: string, category?: string, label?: string, value?: number) {
  if (!hasConsent()) return;
  const eventParams: any = { action };
  if (category) eventParams.category = category;
  if (label) eventParams.label = label;
  if (value !== undefined) eventParams.value = value;
  ReactGA.event(eventParams);
}

// Tracker l'ajout d'un article
export function trackAddArticle(articleName: string, category?: string) {
  if (!hasConsent()) return;
  ReactGA.event({
    action: 'add_article',
    category: category || 'Article',
    label: articleName,
  });
}

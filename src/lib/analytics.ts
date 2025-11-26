import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID ;

// Tracker la création d'un inventaire
export function trackCreateInventory(inventoryName: string) {
  ReactGA.event({
    action: 'create_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}

// Tracker la modification d'un inventaire
export function trackUpdateInventory(inventoryName: string) {
  ReactGA.event({
    action: 'update_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}

// Tracker la suppression d'un inventaire
export function trackDeleteInventory(inventoryName: string) {
  ReactGA.event({
    action: 'delete_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}

// Tracker la validation d'un inventaire
export function trackValidateInventory(inventoryName: string) {
  ReactGA.event({
    action: 'validate_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}

// Tracker l'export d'un inventaire
export function trackExportInventory(inventoryName: string) {
  ReactGA.event({
    action: 'export_inventory',
    category: 'Inventory',
    label: inventoryName,
  });
}
// src/lib/analytics.ts


export function initAnalytics() {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

export function trackPageView(path: string) {
  ReactGA.send({ hitType: "pageview", page: path });
}


export function trackEvent(action: string, category?: string, label?: string, value?: number) {
  ReactGA.event({
    action,
    category,
    label,
    value,
  });
}

// Tracker l'ajout d'un article
export function trackAddArticle(articleName: string, category?: string) {
  ReactGA.event({
    action: 'add_article',
    category: category || 'Article',
    label: articleName,
  });
}

'use client';

import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function hasConsent(): boolean {
  return localStorage.getItem('telecomstock-cookie-consent') === 'accepted';
}

export function initAnalytics() {
  if (!hasConsent() || !GA_MEASUREMENT_ID) return;
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

export function trackPageView(path: string) {
  if (!hasConsent()) return;
  ReactGA.send({ hitType: 'pageview', page: path });
}

export function trackEvent(action: string, category?: string, label?: string, value?: number) {
  if (!hasConsent()) return;
  const eventParams: any = { action };
  if (category) eventParams.category = category;
  if (label) eventParams.label = label;
  if (value !== undefined) eventParams.value = value;
  ReactGA.event(eventParams);
}

export function trackAddArticle(articleName: string, category?: string) {
  if (!hasConsent()) return;
  ReactGA.event({ action: 'add_article', category: category || 'Article', label: articleName });
}

export function trackCreateInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({ action: 'create_inventory', category: 'Inventory', label: inventoryName });
}

export function trackUpdateInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({ action: 'update_inventory', category: 'Inventory', label: inventoryName });
}

export function trackDeleteInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({ action: 'delete_inventory', category: 'Inventory', label: inventoryName });
}

export function trackValidateInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({ action: 'validate_inventory', category: 'Inventory', label: inventoryName });
}

export function trackExportInventory(inventoryName: string) {
  if (!hasConsent()) return;
  ReactGA.event({ action: 'export_inventory', category: 'Inventory', label: inventoryName });
}

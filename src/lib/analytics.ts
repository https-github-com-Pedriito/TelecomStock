// src/lib/analytics.ts
import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = "G-DD6R770V3P"; 

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

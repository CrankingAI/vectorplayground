import type { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { APPLICATIONINSIGHTS_CONNECTION_STRING } from './config';

/**
 * Campaign parameters recorded on the landing page view, then removed from the address bar so
 * copied or shared links don't re-attribute later visits (e.g. `utm_source=funwithvectors`,
 * which the legacy-domain redirect in Cloudflare appends).
 */
const CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

let client: Promise<ApplicationInsights | undefined> = Promise.resolve(undefined);

/**
 * Captures how the visitor arrived (landing URL, referrer, utm_source), strips campaign
 * parameters from the URL, and lazily starts Application Insights to record the landing page view.
 *
 * Call once, before the router mounts, so React Router only ever sees the clean URL.
 * A no-op for telemetry when no connection string is configured (local dev, forks).
 */
export function initAnalytics(): void {
  const landingUri = window.location.href;
  const referrer = document.referrer;
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source');

  stripCampaignParams(params);

  const connectionString = APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) return;

  client = import('@microsoft/applicationinsights-web')
    .then(({ ApplicationInsights }) => {
      const appInsights = new ApplicationInsights({
        config: {
          connectionString,
          // Cookieless: no cross-visit user/session identity, so each page load counts as one visit.
          disableCookiesUsage: true,
          // Page views only; API calls are already recorded server-side by the Function App.
          disableAjaxTracking: true,
          disableFetchTracking: true,
          // Don't call Microsoft endpoints beyond our own ingestion endpoint (also keeps the CSP tight):
          // skip the CDN-hosted feature config, and opt out of SDK self-diagnostics ("sdkStats").
          extensionConfig: { AppInsightsCfgSyncPlugin: { blkCdnCfg: true } },
          featureOptIn: { sdkStats: { mode: 2 /* FeatureOptInMode.disable (ambient const enum) */ } },
        },
      });
      appInsights.loadAppInsights();
      appInsights.trackPageView({
        uri: landingUri,
        refUri: referrer || undefined,
        properties: { landing: true, ...(utmSource && { utmSource }) },
      });
      return appInsights;
    })
    .catch(() => undefined); // Analytics must never break the app.
}

/** Records an in-app navigation as a page view. */
export function trackPageView(): void {
  void client.then((appInsights) => appInsights?.trackPageView({ uri: window.location.href }));
}

function stripCampaignParams(params: URLSearchParams): void {
  if (!CAMPAIGN_PARAMS.some((name) => params.has(name))) return;

  CAMPAIGN_PARAMS.forEach((name) => params.delete(name));
  const query = params.toString();
  const { pathname, hash } = window.location;
  window.history.replaceState(window.history.state, '', `${pathname}${query ? `?${query}` : ''}${hash}`);
}

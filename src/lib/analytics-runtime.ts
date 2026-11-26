import { isAnalyticsUrl, validMeasurementId } from "./analytics-policy";

// Old localStorage grants never covered the demo. Deliberately do not migrate them.
export const ANALYTICS_CONSENT_KEY = "archwalk_analytics_marketing_demo_v2";
export const ANALYTICS_CONSENT_EVENT = "archwalk:analytics-consent";
export type AnalyticsConsent = "granted" | "denied" | null;
type AnalyticsWindow = Window & { dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void };
const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
let configured = false, consentGranted = false, stopped = false, guarded = false;
let lastPage = "";
function target() { return window as AnalyticsWindow; }
export function readAnalyticsConsent(): AnalyticsConsent {
  if (typeof document === "undefined") return null;
  try {
    const value = document.cookie.split(";").map(part => part.trim())
      .find(part => part.startsWith(ANALYTICS_CONSENT_KEY + "="))?.split("=")[1];
    return value === "granted" || value === "denied" ? value : null;
  } catch { return null; }
}
export function analyticsAllowed() {
  return typeof window !== "undefined" && process.env.NODE_ENV === "production"
    && process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview"
    && validMeasurementId(measurementId) && window.self === window.top
    && isAnalyticsUrl(window.location.href);
}
function disable() {
  if (typeof window !== "undefined" && validMeasurementId(measurementId))
    Object.assign(window, { ["ga-disable-" + measurementId]: true });
}
function pageFields() {
  return { page_location: location.origin + location.pathname, page_referrer: "", page_title: location.pathname };
}
/** Installed before Google. Private navigation opts out for this document's lifetime. */
export function installAnalyticsNavigationGuard() {
  if (guarded || !validMeasurementId(measurementId)) return;
  guarded = true;
  const inspect = (href: string) => {
    if (!isAnalyticsUrl(href)) { stopped = true; disable(); }
  };
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    history[method] = function (data: unknown, unused: string, url?: string | URL | null) {
      if (url != null) inspect(new URL(url, location.href).href);
      const result = original.call(this, data, unused, url);
      trackPageView();
      return result;
    };
  }
  const navigated = () => { inspect(location.href); trackPageView(); };
  window.addEventListener("popstate", navigated, true);
  window.addEventListener("hashchange", navigated, true);
  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (link instanceof HTMLAnchorElement && link.origin === location.origin
      && link.target !== "_blank" && !event.ctrlKey && !event.metaKey && !event.shiftKey) inspect(link.href);
  }, true);
}
export function startAnalytics() {
  if (!analyticsAllowed() || readAnalyticsConsent() !== "granted" || stopped) return;
  installAnalyticsNavigationGuard();
  Object.assign(window, { ["ga-disable-" + measurementId]: false });
  if (configured) {
    if (!consentGranted) target().gtag?.("consent", "update", { analytics_storage: "granted" });
    consentGranted = true;
    trackPageView();
    return;
  }
  configured = consentGranted = true;
  target().dataLayer ??= [];
  // Google's queue uses arguments objects.
  // eslint-disable-next-line prefer-rest-params
  target().gtag = function () { target().dataLayer?.push(arguments); };
  target().gtag?.("consent", "default", {
    analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
  });
  target().gtag?.("js", new Date());
  target().gtag?.("config", measurementId, {
    ...pageFields(), send_page_view: false, cookie_domain: "archwalk.app", cookie_path: "/",
    allow_google_signals: false, allow_ad_personalization_signals: false,
  });
  trackPageView();
}
export function pauseAnalytics() {
  disable();
  if (configured && consentGranted) target().gtag?.("consent", "update", { analytics_storage: "denied" });
  consentGranted = false;
  // Hydration and excluded routes may pause a fresh document with shared consent.
  // Preserve identifiers then; only missing/withdrawn consent clears cookies.
  if (typeof document === "undefined" || readAnalyticsConsent() === "granted") return;
  try {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.trim().split("=")[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ["", "; Domain=.archwalk.app", "; Domain=" + location.hostname])
        document.cookie = name + "=; Max-Age=0; Path=/" + domain + "; Secure; SameSite=Lax";
    }
  } catch { /* Opaque frames and blocked cookie access stay opted out. */ }
}
export function setAnalyticsConsent(value: Exclude<AnalyticsConsent, null>) {
  if (!analyticsAllowed()) return;
  try {
    document.cookie = ANALYTICS_CONSENT_KEY + "=" + value
      + "; Max-Age=15552000; Path=/; Domain=archwalk.app; Secure; SameSite=Lax";
  } catch { stopped = true; pauseAnalytics(); return; }
  // A refused write must never let an old grant reactivate after withdrawal.
  if (readAnalyticsConsent() !== value) { stopped = true; pauseAnalytics(); return; }
  if (value === "denied" || readAnalyticsConsent() !== "granted") pauseAnalytics();
  else startAnalytics();
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
}
/** Shared cookies have no cross-origin storage event. Poll tabs and recheck on focus.
 * Application events also recheck synchronously; denied events are never queued. */
export function observeAnalyticsConsent(notify: () => void) {
  let previous = readAnalyticsConsent();
  const check = () => {
    const next = readAnalyticsConsent();
    if (next !== "granted") pauseAnalytics();
    if (next !== previous) { previous = next; notify(); }
  };
  const timer = window.setInterval(check, 1000);
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", check);
  window.addEventListener(ANALYTICS_CONSENT_EVENT, check);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", check);
    document.removeEventListener("visibilitychange", check);
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, check);
  };
}
function canSend() {
  if (readAnalyticsConsent() !== "granted") { pauseAnalytics(); return false; }
  return analyticsAllowed() && configured && consentGranted && !stopped;
}
export function trackPageView() {
  if (!canSend()) return;
  const page = location.origin + location.pathname;
  if (lastPage === page) return;
  lastPage = page;
  target().gtag?.("set", pageFields());
  target().gtag?.("event", "page_view", pageFields());
}
/** Call only from typed event adapters, never with raw URLs or bridge payloads. */
export function sendAnalyticsEvent(name: string, parameters: Record<string, string | number> = {}) {
  if (!canSend()) return false;
  target().gtag?.("event", name, { ...parameters, ...pageFields() });
  return true;
}

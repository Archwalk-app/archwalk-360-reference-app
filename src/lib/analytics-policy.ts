/** Only the public museum pages on the production demo hostname. */
export function isAnalyticsPath(path: string): boolean {
  return path === "/viewer" || path === "/viewer/credits";
}

export function isAnalyticsUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:" && url.hostname === "demo.archwalk.app"
      && !url.port && !url.username && !url.password && isAnalyticsPath(url.pathname);
  } catch { return false; }
}

export function validMeasurementId(value: string | undefined): value is string {
  return /^G-[A-Z0-9]+$/.test(value ?? "");
}

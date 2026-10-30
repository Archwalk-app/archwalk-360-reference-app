import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const SESSION_SECONDS = 8 * 60 * 60;
export function demoConfig() {
  const password = process.env.DEMO_ACCESS_PASSWORD;
  const secret = process.env.DEMO_SESSION_SECRET;
  return password &&
    password.length >= 12 &&
    secret &&
    secret.length >= 32 &&
    secret !== password
    ? { password, secret }
    : null;
}
export function demoCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-aw-demo" : "aw-demo";
}
function signature(payload: string) {
  const config = demoConfig();
  if (!config) return null;
  // Rotating either owner credential invalidates existing sessions.
  return createHmac("sha256", config.secret)
    .update(config.password)
    .update("\0")
    .update(payload)
    .digest();
}
export function createDemoSession(now = Date.now()) {
  const payload = `${Math.floor(now / 1000)}.${randomBytes(24).toString("base64url")}`;
  const mac = signature(payload);
  if (!mac) throw new Error("Demo access is unavailable.");
  return `${payload}.${mac.toString("base64url")}`;
}
export function validDemoSession(token: string | undefined, now = Date.now()) {
  if (!token || token.length > 256) return false;
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    !/^\d{10,}$/.test(parts[0]) ||
    !/^[\w-]{32}$/.test(parts[1]) ||
    !/^[\w-]{43}$/.test(parts[2])
  )
    return false;
  const issued = Number(parts[0]);
  const current = Math.floor(now / 1000);
  if (issued > current || current - issued >= SESSION_SECONDS) return false;
  const expected = signature(`${parts[0]}.${parts[1]}`);
  const actual = Buffer.from(parts[2], "base64url");
  return (
    !!expected &&
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}
export function verifyDemoPassword(value: unknown) {
  const config = demoConfig();
  if (!config || typeof value !== "string" || value.length > 1024) return false;
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(value), hash(config.password));
}
export function requestDemoSession(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${demoCookieName()}=`));
  return validDemoSession(cookie?.slice(demoCookieName().length + 1));
}
export function isProtectedDemoPage(path: string) {
  return (
    path === "/editor" ||
    path.startsWith("/editor/") ||
    path === "/plugin" ||
    path.startsWith("/plugin/")
  );
}
export function safeDemoReturn(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 1024 ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return "/editor";
  try {
    const url = new URL(value, "https://demo.invalid");
    return value.startsWith("/") &&
      url.origin === "https://demo.invalid" &&
      isProtectedDemoPage(url.pathname)
      ? url.pathname + url.search + url.hash
      : "/editor";
  } catch {
    return "/editor";
  }
}
export function sameDemoOrigin(request: Request) {
  try {
    const expected = new URL(process.env.APP_ORIGIN || request.url).origin;
    return (
      request.headers.get("origin") === expected &&
      request.headers.get("sec-fetch-site") !== "cross-site"
    );
  } catch {
    return false;
  }
}
export function demoError(status: number, error: string) {
  return Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function requireDemoApi(request: Request) {
  if (!demoConfig()) return demoError(503, "Demo access is unavailable.");
  if (!requestDemoSession(request))
    return demoError(401, "Unlock the demo to continue.");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !sameDemoOrigin(request)
  )
    return demoError(403, "Request not allowed.");
  return null;
}
export function demoCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

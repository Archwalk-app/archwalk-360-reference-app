// Bounded, best-effort per-instance throttling. No passwords or raw IPs stored.
import { createHash } from "node:crypto";
const buckets = new Map<string, { attempts: number; until: number }>();
const WINDOW = 15 * 60 * 1000;
export function allowDemoLogin(request: Request, now = Date.now()) {
  for (const [key, bucket] of buckets)
    if (bucket.until <= now) buckets.delete(key);
  // Outside a managed proxy, use one shared bucket rather than trusting spoofable IP headers.
  const address = process.env.VERCEL
    ? request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    : "local";
  const key = createHash("sha256").update(address).digest("hex");
  const bucket = buckets.get(key) || { attempts: 0, until: now + WINDOW };
  if (!buckets.has(key) && buckets.size >= 4096) return false;
  if (bucket.attempts >= 10) return false;
  bucket.attempts++;
  buckets.set(key, bucket);
  return true;
}

import { NextResponse } from "next/server";
import {
  createDemoSession,
  demoConfig,
  demoCookieName,
  demoCookieOptions,
  demoError,
  safeDemoReturn,
  sameDemoOrigin,
  verifyDemoPassword,
} from "@/lib/demo-auth";
import { allowDemoLogin } from "@/lib/demo-login-limit";
export async function POST(request: Request) {
  if (!demoConfig()) return demoError(503, "Demo access is unavailable.");
  if (!sameDemoOrigin(request)) return demoError(403, "Request not allowed.");
  if (!allowDemoLogin(request))
    return Response.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": "900", "Cache-Control": "no-store" },
      },
    );
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return demoError(400, "Unable to unlock demo.");
  let body;
  try {
    const text = await request.text();
    if (text.length > 4096) throw new Error();
    body = JSON.parse(text);
  } catch {
    return demoError(400, "Unable to unlock demo.");
  }
  if (!body || !verifyDemoPassword(body.password))
    return demoError(
      401,
      "Unable to unlock demo. Check the password and try again.",
    );
  const response = NextResponse.json(
    { returnTo: safeDemoReturn(body.returnTo) },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(
    demoCookieName(),
    createDemoSession(),
    demoCookieOptions(),
  );
  return response;
}

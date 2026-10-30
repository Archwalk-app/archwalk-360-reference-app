import { NextRequest, NextResponse } from "next/server";
import {
  demoConfig,
  demoError,
  requestDemoSession,
  requireDemoApi,
} from "./lib/demo-auth";
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/archwalk/"))
    return requireDemoApi(request) || NextResponse.next();
  if (!demoConfig() || !requestDemoSession(request)) {
    const url = new URL("/demo-login", request.url);
    url.searchParams.set(
      "returnTo",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    if (!["GET", "HEAD"].includes(request.method))
      return demoError(401, "Unlock the demo to continue.");
    return NextResponse.redirect(url, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/editor/:path*", "/plugin/:path*", "/api/archwalk/:path*"],
};

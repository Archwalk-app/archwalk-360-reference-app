import { NextResponse } from "next/server";
import {
  demoCookieName,
  demoCookieOptions,
  demoError,
  sameDemoOrigin,
} from "@/lib/demo-auth";
export async function POST(request: Request) {
  if (!sameDemoOrigin(request)) return demoError(403, "Request not allowed.");
  const response = NextResponse.redirect(
    new URL(
      "/viewer",
      process.env.APP_ORIGIN || request.headers.get("origin") || request.url,
    ),
    303,
  );
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(demoCookieName(), "", {
    ...demoCookieOptions(),
    maxAge: 0,
  });
  return response;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoCookieName, safeDemoReturn, validDemoSession } from "./demo-auth";
export async function requireDemoPage(returnTo: string) {
  const jar = await cookies();
  if (!validDemoSession(jar.get(demoCookieName())?.value))
    redirect(
      `/demo-login?returnTo=${encodeURIComponent(safeDemoReturn(returnTo))}`,
    );
}

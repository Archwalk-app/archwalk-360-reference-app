import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MuseumHeader } from "../viewer/museum-header";
import { LoginForm } from "./login-form";
import {
  demoConfig,
  demoCookieName,
  safeDemoReturn,
  validDemoSession,
} from "@/lib/demo-auth";
export const metadata: Metadata = {
  title: "Unlock demo | Rooms in Time",
  robots: { index: false, follow: false },
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeDemoReturn((await searchParams).returnTo);
  if (validDemoSession((await cookies()).get(demoCookieName())?.value))
    redirect(returnTo);
  return (
    <div className="museum-site min-h-dvh">
      <MuseumHeader />
      <main className="mx-auto w-full max-w-md px-6 py-16 sm:py-24">
        <p className="museum-eyebrow">A closer look, by invitation</p>
        <h1 className="mt-4 font-serif text-4xl">Welcome to the workspace.</h1>
        <p className="mb-8 mt-4 text-sm leading-7 text-muted">
          One password unlocks the Hallwyl Museum Creator and the Blue Lagoon
          hotel demo. The museum exhibition is always open to everyone.
        </p>
        <LoginForm returnTo={returnTo} configured={!!demoConfig()} />
      </main>
    </div>
  );
}

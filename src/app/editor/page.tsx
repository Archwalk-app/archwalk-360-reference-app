import { requireDemoPage } from "@/lib/demo-page-auth";
import { DemoNavigation } from "../demo-navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CreatorEmbed } from "./creator-embed";
import { MuseumHeader } from "../viewer/museum-header";
import {
  createMuseumClient,
  resolveMuseumExperience,
} from "@/lib/archwalk/museum.server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Hallwyl Museum — Curator demo workspace | ArchWalk",
  robots: { index: false, follow: false },
};
export default async function EditorPage() {
  await requireDemoPage("/editor");
  const config = createMuseumClient().config;
  let connected = false;
  if (config.configured) {
    try {
      await resolveMuseumExperience();
      connected = true;
    } catch {
      /* Display a non-destructive setup state; never create a replacement. */
    }
  }
  return (
    <div className="museum-site">
      <MuseumHeader />
      <div className="museum-container pt-3">
        <DemoNavigation />
      </div>
      <main className="museum-container py-10">
        <div data-editor-intro className="max-w-3xl">
          <p className="museum-eyebrow">Curator demo workspace</p>
          <h1 className="mt-3 font-serif text-4xl">Hallwyl Museum</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            Manage the same existing Hallwyl Museum Experience shown in the
            exhibition. The connection is verified before opening the embedded
            editor.
          </p>
          <Link href="/viewer" className="museum-text-link">
            View public exhibition ↗
          </Link>
        </div>
        <div data-editor-workspace className="mt-6">
          {connected ? (
            <CreatorEmbed />
          ) : (
            <section
              role="status"
              className="rounded-lg border border-border bg-surface p-7"
            >
              <h2 className="font-serif text-2xl">
                Connect the existing Hallwyl Experience
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                The production Item ID must resolve to the existing Hallwyl
                Museum Experience. Configure the server-side HALLWYL_API_BASE,
                HALLWYL_APP_ORIGIN, HALLWYL_API_KEY and APP_ORIGIN; use
                HALLWYL_ITEM_ID for the connected Item ID, and
                HALLWYL_CUSTOMER_ID only if the connection has a customer scope.
                No Experience has been created or changed.
              </p>
            </section>
          )}
        </div>
        <p className="mt-8 text-xs text-muted">
          Independent ArchWalk 360 demonstration. Not an official Hallwyl Museum
          website.
        </p>
      </main>
    </div>
  );
}

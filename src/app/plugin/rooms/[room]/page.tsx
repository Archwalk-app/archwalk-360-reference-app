import { requireDemoPage } from "@/lib/demo-page-auth";
import { DemoNavigation } from "../../../demo-navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewerEmbed } from "@/app/viewer/viewer-embed";
import { createPartnerClient } from "@/lib/archwalk/client";
import { viewerIframeSrc } from "@/lib/archwalk/protocol";
import {
  PLUGIN_RESORT,
  buildPluginInventory,
  findPluginRoom,
} from "@/lib/plugin/inventory";

export const dynamic = "force-dynamic";

export default async function PluginRoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;
  await requireDemoPage(`/plugin/rooms/${encodeURIComponent(room)}`);
  const found = findPluginRoom(buildPluginInventory(), room);
  if (!found) notFound();

  const client = createPartnerClient();
  let embedUrl: string | null = null;
  let statusLabel = "Not published yet";

  if (client.config.configured) {
    try {
      const experience = await client.getExperienceByExternalId({
        external_resource_id: found.variant.external_resource_id,
        external_customer_id: found.variant.external_customer_id,
      });
      if (experience?.publication_status === "published") {
        embedUrl = viewerIframeSrc(
          client.config.appOrigin,
          experience.public_id,
        );
        statusLabel = "Published 360 experience";
      } else {
        statusLabel = "Draft — not shown to guests yet";
      }
    } catch {
      statusLabel = "360 experience unavailable";
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/plugin" className="font-serif text-2xl tracking-tight">
            Reference Realty<span className="text-accent">.</span>
          </Link>
          <div>
            <p className="text-xs text-muted sm:text-sm">
              {PLUGIN_RESORT.name}
            </p>
            <DemoNavigation />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-12 pt-7 sm:px-8 sm:pt-9">
        <p className="text-xs text-muted">
          Guest room{" "}
          <span aria-hidden className="mx-2">
            /
          </span>{" "}
          {found.variant.name}
        </p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">
          Room {found.room.room_number}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {found.variant.name} · {found.variant.room_count} matching rooms share
          this 360 experience
        </p>
        <p className="mt-4 text-sm text-muted">{statusLabel}</p>
        <div className="mt-6 min-h-[28rem] overflow-hidden border border-border bg-surface md:min-h-[36rem]">
          {embedUrl ? (
            <div className="h-[28rem] md:h-[36rem]">
              <ViewerEmbed src={embedUrl} />
            </div>
          ) : (
            <div className="flex h-[28rem] items-center justify-center px-6 text-center text-sm text-muted md:h-[36rem]">
              This room type does not have a published 360 experience yet.
            </div>
          )}
        </div>
        <p className="mt-6 text-sm text-muted">
          Rooms 101 and 102 are the same Deluxe King variant. After publish they
          use the same Viewer.
        </p>
        <Link
          href="/plugin"
          className="mt-6 inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-accent"
        >
          Back to resort dashboard
        </Link>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  creatorInitMessage,
  isTrustedArchWalkMessage,
  tokenAppearsInUrl,
} from "@/lib/archwalk/protocol";
import type { PluginVariantRow } from "@/lib/plugin/sync";

type PluginPayload = {
  configured?: boolean;
  missing?: string[];
  error?: string;
  appOrigin?: string;
  resort?: { name: string; location: string };
  physical_room_count: number;
  visual_variant_count: number;
  synced?: number;
  failed?: number;
  variants: PluginVariantRow[];
};

type SessionPayload = {
  sessionApiId: string;
  token: string;
  creatorOrigin: string;
  creatorUrl: string;
  publicationStatus: "unpublished" | "published";
  publicId: string;
  experienceId: string;
  error?: string;
};

function statusClass(status: string) {
  if (status === "Published") return "text-emerald-800";
  if (status === "Needs attention") return "text-red-800";
  if (status === "Draft") return "text-amber-800";
  return "text-muted";
}

export function PluginWorkspace() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tokenRef = useRef<string | null>(null);
  const originRef = useRef<string | null>(null);
  const [payload, setPayload] = useState<PluginPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [editorStatus, setEditorStatus] = useState("Select a room type");
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/archwalk/plugin", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as PluginPayload;
        if (cancelled) return;
        setPayload(body);
        if (body.error) setLoadError(body.error);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setLoadError(
            reason instanceof Error
              ? reason.message
              : "Unable to load imported rooms.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearCreator = useCallback(() => {
    tokenRef.current = null;
    originRef.current = null;
    setIframeSrc(null);
    setEditorError(null);
  }, []);

  const openCreator = useCallback(
    async (variantId: string) => {
      if (selectedId && selectedId !== variantId) {
        clearCreator();
      }
      setSelectedId(variantId);
      setEditorError(null);
      setEditorStatus("Opening ArchWalk Creator…");
      const response = await fetch("/api/archwalk/plugin/creator-session", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      const body = (await response.json()) as SessionPayload;
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to start the 360 editor.");
      }
      if (tokenAppearsInUrl(body.creatorUrl, body.token)) {
        throw new Error("Creator session token must not appear in the iframe URL.");
      }
      tokenRef.current = body.token;
      originRef.current = body.creatorOrigin;
      setIframeSrc(body.creatorUrl);
      setEditorStatus("Waiting for editor…");
      setPayload((current) => {
        if (!current) return current;
        return {
          ...current,
          variants: current.variants.map((row) =>
            row.id === variantId
              ? {
                  ...row,
                  experience_id: body.experienceId,
                  publication_status: body.publicationStatus,
                  public_id:
                    body.publicationStatus === "published" ? body.publicId : null,
                  status:
                    body.publicationStatus === "published" ? "Published" : "Draft",
                  ok: true,
                }
              : row,
          ),
        };
      });
    },
    [clearCreator, selectedId],
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const iframeWindow = iframeRef.current?.contentWindow ?? null;
      const expectedOrigin = originRef.current;
      if (!expectedOrigin) return;
      if (!isTrustedArchWalkMessage(event, expectedOrigin, iframeWindow)) {
        return;
      }

      if (event.data.type === "creator:ready-for-init") {
        const token = tokenRef.current;
        if (!token || !iframeWindow) return;
        iframeWindow.postMessage(creatorInitMessage(token), expectedOrigin);
        return;
      }

      if (event.data.type === "creator:ready") {
        setEditorStatus("Ready");
        setEditorError(null);
        return;
      }

      if (event.data.type === "creator:published") {
        const record = event.data as { publicId?: unknown };
        const publicId =
          typeof record.publicId === "string" ? record.publicId : null;
        setPayload((current) => {
          if (!current || !selectedId) return current;
          return {
            ...current,
            variants: current.variants.map((row) =>
              row.id === selectedId
                ? {
                    ...row,
                    status: "Published",
                    publication_status: "published",
                    public_id: publicId ?? row.public_id,
                  }
                : row,
            ),
          };
        });
        setEditorStatus("Published");
        return;
      }

      if (event.data.type === "creator:unpublished") {
        setPayload((current) => {
          if (!current || !selectedId) return current;
          return {
            ...current,
            variants: current.variants.map((row) =>
              row.id === selectedId
                ? {
                    ...row,
                    status: "Draft",
                    publication_status: "unpublished",
                    public_id: null,
                  }
                : row,
            ),
          };
        });
        setEditorStatus("Draft");
        return;
      }

      if (event.data.type === "creator:reauth-required") {
        if (!selectedId) return;
        setEditorStatus("Reauthenticating…");
        openCreator(selectedId).catch((reason: unknown) => {
          setEditorError(
            reason instanceof Error
              ? reason.message
              : "The 360 editor session expired.",
          );
        });
        return;
      }

      if (event.data.type === "creator:error") {
        const record = event.data as { message?: unknown };
        setEditorError(
          typeof record.message === "string"
            ? record.message
            : "The 360 editor reported an error.",
        );
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [openCreator, selectedId]);

  useEffect(() => {
    return () => {
      tokenRef.current = null;
    };
  }, []);

  const variants = payload?.variants ?? [];
  const selected = variants.find((row) => row.id === selectedId) ?? null;
  const deluxe = variants.find((row) => row.id === "deluxe_king");

  return (
    <main className="mx-auto grid w-full max-w-[1600px] flex-1 gap-8 px-5 py-8 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:items-start lg:px-8 lg:py-10">
      <section>
        <p className="text-xs font-medium tracking-[0.16em] text-accent uppercase">
          Imported inventory
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          {payload?.resort?.name ?? "Blue Lagoon Resort"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {payload?.resort?.location ?? "Coastal Maldives"}
        </p>
        <p className="mt-5 text-base leading-7 text-foreground">
          {payload
            ? `${payload.physical_room_count} rooms imported · ${payload.visual_variant_count} visual variants · ${payload.visual_variant_count} ArchWalk Experiences`
            : "Loading imported rooms…"}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Physical rooms stay in Reference Realty. ArchWalk maps each visually
          distinct room type once. Rooms 101 and 102 are both Deluxe King, so
          they share one published 360 experience.
        </p>
        {loadError ? (
          <p className="mt-3 text-sm text-red-800">{loadError}</p>
        ) : null}
        {payload && !payload.configured ? (
          <p className="mt-3 text-sm text-muted">
            Set the ArchWalk server environment on this Next.js app to provision
            Experiences automatically.
          </p>
        ) : null}

        <div className="mt-6 overflow-x-auto border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-3 py-3 font-medium">Room type</th>
                <th className="px-3 py-3 font-medium">Rooms</th>
                <th className="px-3 py-3 font-medium">360</th>
                <th className="px-3 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr
                  key={variant.id}
                  className={
                    variant.id === selectedId
                      ? "border-b border-border bg-[#f3ebe3]"
                      : "border-b border-border last:border-0"
                  }
                >
                  <td className="px-3 py-3 font-medium">{variant.name}</td>
                  <td className="px-3 py-3 text-muted">{variant.room_count}</td>
                  <td className={`px-3 py-3 ${statusClass(variant.status)}`}>
                    {variant.status}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-full bg-foreground px-3 text-xs font-medium text-background"
                      onClick={() => {
                        openCreator(variant.id).catch((reason: unknown) => {
                          setEditorError(
                            reason instanceof Error
                              ? reason.message
                              : "Unable to open Creator.",
                          );
                        });
                      }}
                    >
                      Edit 360
                    </button>
                    {variant.status === "Published" && variant.sample_rooms[0] ? (
                      <Link
                        href={`/plugin/rooms/${variant.sample_rooms[0]}`}
                        className="ml-2 inline-flex min-h-11 items-center rounded-full border border-border px-3 text-xs font-medium hover:text-accent"
                      >
                        View 360
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {deluxe ? (
          <p className="mt-4 text-sm text-muted">
            Guest rooms{" "}
            <Link className="underline underline-offset-4 hover:text-accent" href="/plugin/rooms/101">
              101
            </Link>
            {" · "}
            <Link className="underline underline-offset-4 hover:text-accent" href="/plugin/rooms/102">
              102
            </Link>{" "}
            reuse the Deluxe King experience.
          </p>
        ) : null}
      </section>

      <section className="border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-medium tracking-[0.16em] text-accent uppercase">
          ArchWalk 360
        </p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight">
          {selected?.name ?? "Select a room type"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {selected
            ? `${selected.room_count} physical rooms share this Experience. Upload, navigation, floor plan, and publish stay in Creator.`
            : "Edit 360 opens ArchWalk Creator here. This page does not rebuild the editor."}
        </p>
        <p className="mt-2 text-xs text-muted">{editorStatus}</p>
        {editorError ? (
          <p className="mt-2 text-sm text-red-800">{editorError}</p>
        ) : null}
        <div className="mt-4 min-h-[min(64dvh,30rem)] bg-background md:min-h-[clamp(40rem,72dvh,52rem)]">
          {iframeSrc ? (
            <iframe
              key={iframeSrc}
              ref={iframeRef}
              title="ArchWalk 360 Creator"
              src={iframeSrc}
              allow="fullscreen"
              allowFullScreen
              className="block h-[min(64dvh,30rem)] w-full border-0 md:h-[clamp(40rem,72dvh,52rem)]"
            />
          ) : (
            <div className="flex h-[min(64dvh,30rem)] items-center justify-center border border-dashed border-border text-sm text-muted md:h-[clamp(40rem,72dvh,52rem)]">
              Creator opens here.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

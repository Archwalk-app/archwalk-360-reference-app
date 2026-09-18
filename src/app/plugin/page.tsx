import Link from "next/link";
import { PluginWorkspace } from "./plugin-workspace";
import { PLUGIN_RESORT } from "@/lib/plugin/inventory";

export const dynamic = "force-dynamic";

export default function PluginPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-medium tracking-wide text-foreground">
              Reference Realty
            </p>
            <p className="text-xs text-muted">{PLUGIN_RESORT.name}</p>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <span className="font-medium text-foreground">Resort 360</span>
            <Link
              href="/editor"
              className="min-h-11 inline-flex items-center hover:text-accent"
            >
              Single listing
            </Link>
            <Link
              href="/viewer"
              className="min-h-11 inline-flex items-center hover:text-accent"
            >
              Guest listing
            </Link>
          </nav>
        </div>
      </header>
      <PluginWorkspace />
    </div>
  );
}

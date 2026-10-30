import { requireDemoPage } from "@/lib/demo-page-auth";
import { DemoNavigation } from "../demo-navigation";
import { PluginWorkspace } from "./plugin-workspace";
import { PLUGIN_RESORT } from "@/lib/plugin/inventory";

export const dynamic = "force-dynamic";

export default async function PluginPage() {
  await requireDemoPage("/plugin");
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-medium tracking-wide text-foreground">
              Reference Realty
            </p>
            <p className="text-xs text-muted">{PLUGIN_RESORT.name}</p>
          </div>
          <DemoNavigation />
        </div>
      </header>
      <PluginWorkspace />
    </div>
  );
}

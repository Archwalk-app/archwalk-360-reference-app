import { requireDemoPage } from "@/lib/demo-page-auth";
import { DemoNavigation } from "../demo-navigation";
import { PluginWorkspace } from "./plugin-workspace";

export const dynamic = "force-dynamic";

export default async function PluginPage() {
  await requireDemoPage("/plugin");
  return (
    <div className="hotel-demo flex min-h-full flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <p className="font-serif text-xl font-medium tracking-[0.06em] text-foreground">
              ZESORA <span className="text-accent">·</span> NATHIA GALI
            </p>
            <p className="text-xs text-muted">Private integration concept · Powered by ArchWalk 360</p>
          </div>
          <DemoNavigation />
        </div>
      </header>
      <PluginWorkspace />
    </div>
  );
}

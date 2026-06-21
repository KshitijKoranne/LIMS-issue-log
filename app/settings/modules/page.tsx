import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { PanelLoading } from "@/components/PanelLoading";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getModules } from "@/lib/data";
import { ModuleManager } from "./ModuleManager";

export const dynamic = "force-dynamic";

async function ModulesContent() {
  const data = await getModules();
  return data.configured ? <ModuleManager modules={data.modules} /> : <SetupState />;
}

export default async function ModulesPage() {
  await requireSession();

  return (
    <AppShell active="modules">
      <div className="topbar">
        <div>
          <h1>Modules</h1>
        </div>
      </div>
      <Suspense fallback={<PanelLoading label="Loading modules" />}>
        <ModulesContent />
      </Suspense>
    </AppShell>
  );
}

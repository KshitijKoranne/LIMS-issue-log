import { AppShell } from "@/components/AppShell";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getModules } from "@/lib/data";
import { ModuleManager } from "./ModuleManager";

export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  await requireSession();
  const data = await getModules();

  return (
    <AppShell active="modules">
      <div className="topbar">
        <div>
          <h1>Modules</h1>
        </div>
      </div>
      {data.configured ? <ModuleManager modules={data.modules} /> : <SetupState />}
    </AppShell>
  );
}

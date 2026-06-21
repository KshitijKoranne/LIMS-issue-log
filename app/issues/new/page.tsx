import { AppShell } from "@/components/AppShell";
import { IssueForm } from "@/components/IssueForm";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getModules } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewIssuePage() {
  await requireSession();
  const data = await getModules();
  const activeModules = data.modules.filter((module) => !module.archivedAt);

  return (
    <AppShell active="new">
      <div className="topbar">
        <div>
          <h1>New issue</h1>
          <div className="topbar-meta">Vadodara / Vapi / Both</div>
        </div>
      </div>
      {data.configured ? (
        <div className="single-column">
          <IssueForm modules={activeModules} />
        </div>
      ) : (
        <SetupState />
      )}
    </AppShell>
  );
}

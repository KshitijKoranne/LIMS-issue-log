import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { IssueForm } from "@/components/IssueForm";
import { PanelLoading } from "@/components/PanelLoading";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getModules } from "@/lib/data";

export const dynamic = "force-dynamic";

async function NewIssueContent() {
  const data = await getModules();
  const activeModules = data.modules.filter((module) => !module.archivedAt);
  return data.configured ? <IssueForm modules={activeModules} /> : <SetupState />;
}

export default async function NewIssuePage() {
  await requireSession();

  return (
    <AppShell active="new">
      <div className="topbar">
        <div>
          <h1>New issue</h1>
        </div>
      </div>
      <Suspense fallback={<PanelLoading label="Loading form" />}>
        <NewIssueContent />
      </Suspense>
    </AppShell>
  );
}

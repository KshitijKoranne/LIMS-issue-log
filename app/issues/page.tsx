import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { IssuesList } from "@/components/IssuesList";
import { PanelLoading } from "@/components/PanelLoading";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

async function IssuesContent() {
  const data = await getDashboardData();
  return data.configured ? <IssuesList issues={data.issues} modules={data.modules} /> : <SetupState />;
}

export default async function IssuesPage() {
  await requireSession();

  return (
    <AppShell active="issues">
      <div className="topbar">
        <div>
          <h1>Issues</h1>
        </div>
      </div>
      <Suspense fallback={<PanelLoading label="Loading issues" />}>
        <IssuesContent />
      </Suspense>
    </AppShell>
  );
}

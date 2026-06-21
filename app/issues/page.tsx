import { AppShell } from "@/components/AppShell";
import { IssuesList } from "@/components/IssuesList";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  await requireSession();
  const data = await getDashboardData();

  return (
    <AppShell active="issues">
      <div className="topbar">
        <div>
          <h1>Issues</h1>
          <div className="topbar-meta">list and expand</div>
        </div>
      </div>
      {data.configured ? <IssuesList issues={data.issues} modules={data.modules} /> : <SetupState />}
    </AppShell>
  );
}

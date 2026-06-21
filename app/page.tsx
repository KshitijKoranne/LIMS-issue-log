import { AppShell } from "@/components/AppShell";
import { DashboardOverview } from "@/components/DashboardOverview";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireSession();
  const data = await getDashboardData();

  return (
    <AppShell active="dashboard">
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
        </div>
        <div className="topbar-meta">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date())}</div>
      </div>
      {data.configured ? <DashboardOverview issues={data.issues} /> : <SetupState />}
    </AppShell>
  );
}

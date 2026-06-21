import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { DashboardOverview } from "@/components/DashboardOverview";
import { PanelLoading } from "@/components/PanelLoading";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

async function DashboardContent() {
  const data = await getDashboardData();
  return data.configured ? <DashboardOverview issues={data.issues} /> : <SetupState />;
}

export default async function HomePage() {
  await requireSession();

  return (
    <AppShell active="dashboard">
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
        </div>
        <div className="topbar-meta">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date())}</div>
      </div>
      <Suspense fallback={<PanelLoading label="Loading dashboard" />}>
        <DashboardContent />
      </Suspense>
    </AppShell>
  );
}

import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireSession();
  const data = await getDashboardData();

  return (
    <AppShell active="issues">
      <div className="topbar">
        <div>
          <h1>LIMS issue log</h1>
          <div className="topbar-meta">Vadodara / Vapi / Both</div>
        </div>
        <div className="topbar-meta">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date())}</div>
      </div>
      {data.configured ? <DashboardClient issues={data.issues} modules={data.modules} /> : <SetupState />}
    </AppShell>
  );
}

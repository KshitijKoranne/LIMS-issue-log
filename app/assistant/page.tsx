import { AppShell } from "@/components/AppShell";
import { AssistantPanel } from "@/components/AssistantPanel";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  await requireSession();
  const data = await getDashboardData();

  return (
    <AppShell active="assistant">
      <div className="topbar">
        <div>
          <h1>Assistant</h1>
        </div>
      </div>
      {data.configured ? <AssistantPanel /> : <SetupState />}
    </AppShell>
  );
}

import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { AssistantPanel } from "@/components/AssistantPanel";
import { PanelLoading } from "@/components/PanelLoading";
import { SetupState } from "@/components/SetupState";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

async function AssistantContent() {
  const data = await getDashboardData();
  return data.configured ? <AssistantPanel /> : <SetupState />;
}

export default async function AssistantPage() {
  await requireSession();

  return (
    <AppShell active="assistant">
      <div className="topbar">
        <div>
          <h1>Assistant</h1>
        </div>
      </div>
      <Suspense fallback={<PanelLoading label="Loading assistant" />}>
        <AssistantContent />
      </Suspense>
    </AppShell>
  );
}

import Link from "next/link";
import { ClipboardList, LayoutDashboard, Layers3, LogOut, PlusCircle } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

export function AppShell({ active, children }: { active: "dashboard" | "new" | "issues" | "modules"; children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="rail">
        <div className="wordmark">
          <strong>LIMS Issues</strong>
          <span>CSV rollout log</span>
        </div>
        <nav className="nav-stack" aria-label="Primary">
          <Link className={`nav-link ${active === "dashboard" ? "active" : ""}`} href="/">
            <LayoutDashboard size={17} />
            Dashboard
          </Link>
          <Link className={`nav-link ${active === "new" ? "active" : ""}`} href="/issues/new">
            <PlusCircle size={17} />
            New issue
          </Link>
          <Link className={`nav-link ${active === "issues" ? "active" : ""}`} href="/issues">
            <ClipboardList size={17} />
            Issues
          </Link>
          <Link className={`nav-link ${active === "modules" ? "active" : ""}`} href="/settings/modules">
            <Layers3 size={17} />
            Modules
          </Link>
        </nav>
        <form action={logoutAction} className="rail-footer">
          <button className="logout-button" type="submit">
            <LogOut size={17} />
            Sign out
          </button>
        </form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

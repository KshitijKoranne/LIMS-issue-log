import Link from "next/link";
import { ClipboardList, Layers3, LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

export function AppShell({ active, children }: { active: "issues" | "modules"; children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="rail">
        <div className="wordmark">
          <strong>LIMS Issues</strong>
          <span>CSV rollout log</span>
        </div>
        <nav className="nav-stack" aria-label="Primary">
          <Link className={`nav-link ${active === "issues" ? "active" : ""}`} href="/">
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

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Bot, ClipboardList, LayoutDashboard, Layers3, LogOut, PlusCircle } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

type NavKey = "dashboard" | "new" | "issues" | "assistant" | "modules";

const navItems: Array<{ href: string; key: NavKey; label: string; icon: ReactNode }> = [
  { href: "/", key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
  { href: "/issues/new", key: "new", label: "New issue", icon: <PlusCircle size={17} /> },
  { href: "/issues", key: "issues", label: "Issues", icon: <ClipboardList size={17} /> },
  { href: "/assistant", key: "assistant", label: "Assistant", icon: <Bot size={17} /> },
  { href: "/settings/modules", key: "modules", label: "Modules", icon: <Layers3 size={17} /> }
];

function keyFromPath(pathname: string | null): NavKey {
  if (pathname === "/issues/new") return "new";
  if (pathname === "/issues") return "issues";
  if (pathname === "/assistant") return "assistant";
  if (pathname === "/settings/modules") return "modules";
  return "dashboard";
}

export function AppShell({ active, children }: { active: NavKey; children: ReactNode }) {
  const pathname = usePathname();
  const [optimisticActive, setOptimisticActive] = useState<NavKey | null>(null);
  const current = optimisticActive || keyFromPath(pathname) || active;

  useEffect(() => {
    setOptimisticActive(null);
  }, [pathname]);

  return (
    <div className="shell">
      <aside className="rail">
        <div className="wordmark">
          <Image className="app-mark" src="/compliance.png" alt="" width={42} height={42} priority />
          <div>
            <strong>LIMS Issues</strong>
            <span>CSV rollout log</span>
          </div>
        </div>
        <nav className="nav-stack" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              aria-current={current === item.key ? "page" : undefined}
              className={`nav-link ${current === item.key ? "active" : ""} ${optimisticActive === item.key ? "pending" : ""}`}
              href={item.href}
              key={item.key}
              onClick={() => setOptimisticActive(item.key)}
              prefetch
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="rail-footer">
          <button className="logout-button" type="submit">
            <LogOut size={17} />
            Sign out
          </button>
        </form>
      </aside>
      <main className="main">
        <div className="route-stage" key={pathname}>
          {children}
        </div>
      </main>
    </div>
  );
}

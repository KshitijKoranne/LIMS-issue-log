import type { IssueRecord } from "@/lib/types";
import type { CSSProperties } from "react";

const chartColors = [
  "var(--color-open)",
  "var(--color-ongoing)",
  "var(--color-closed)",
  "var(--color-accent)",
  "var(--color-low)",
  "var(--color-high)"
];

function countBy<T extends string>(issues: IssueRecord[], getKey: (issue: IssueRecord) => T | null | undefined) {
  return issues.reduce<Record<string, number>>((acc, issue) => {
    const key = getKey(issue) || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function daysOpen(issue: IssueRecord) {
  const start = new Date(issue.createdAt).getTime();
  const end = issue.closedAt ? new Date(issue.closedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

function agingBuckets(issues: IssueRecord[]) {
  const buckets: Record<string, number> = {
    "0-2 days": 0,
    "3-7 days": 0,
    "8-14 days": 0,
    "15-30 days": 0,
    "> 30 days": 0
  };

  for (const issue of issues.filter((item) => item.status !== "Closed")) {
    const age = daysOpen(issue);
    if (age <= 2) buckets["0-2 days"] += 1;
    else if (age <= 7) buckets["3-7 days"] += 1;
    else if (age <= 14) buckets["8-14 days"] += 1;
    else if (age <= 30) buckets["15-30 days"] += 1;
    else buckets["> 30 days"] += 1;
  }

  return buckets;
}

function orderedEntries(values: Record<string, number>, order?: string[]) {
  const entries = Object.entries(values);
  if (!order) return entries.sort((a, b) => b[1] - a[1]);
  const rank = new Map(order.map((item, index) => [item, index]));
  return entries.sort((a, b) => (rank.get(a[0]) ?? 99) - (rank.get(b[0]) ?? 99));
}

function conicGradient(entries: [string, number][]) {
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (!total) return "var(--color-paper-2) 0deg 360deg";

  let cursor = 0;
  return entries
    .map(([, count], index) => {
      const next = cursor + (count / total) * 360;
      const segment = `${chartColors[index % chartColors.length]} ${cursor}deg ${next}deg`;
      cursor = next;
      return segment;
    })
    .join(", ");
}

function barWidth(count: number, max: number) {
  if (count <= 0) return "0%";
  return `${Math.max(8, (count / max) * 100)}%`;
}

function DonutChart({ title, values, order }: { title: string; values: Record<string, number>; order?: string[] }) {
  const entries = orderedEntries(values, order);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <section className="panel dashboard-chart">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
        <span className="topbar-meta">{total} total</span>
      </div>
      <div className="panel-body donut-layout">
        <div className="donut-chart" style={{ background: `conic-gradient(${conicGradient(entries)})` }}>
          <div className="donut-core">
            <strong>{total}</strong>
            <span>Issues</span>
          </div>
        </div>
        <div className="chart-legend">
          {entries.length ? (
            entries.map(([label, count], index) => (
              <div className="legend-row" key={label} style={{ "--i": index } as CSSProperties}>
                <span className="legend-swatch" style={{ background: chartColors[index % chartColors.length] }} />
                <span>{label}</span>
                <strong>{count}</strong>
              </div>
            ))
          ) : (
            <div className="muted">No data</div>
          )}
        </div>
      </div>
    </section>
  );
}

function BarChart({ title, values, order }: { title: string; values: Record<string, number>; order?: string[] }) {
  const entries = orderedEntries(values, order);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <section className="panel dashboard-panel">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
      </div>
      <div className="panel-body bar-list">
        {entries.some(([, count]) => count > 0) ? (
          entries.map(([label, count], index) => (
            <div className="bar-row chart-bar-row" key={label} style={{ "--i": index } as CSSProperties}>
              <div className="bar-label">
                <span>{label}</span>
                <span>{count}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    background: chartColors[index % chartColors.length],
                    width: barWidth(count, max)
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="muted">No data</div>
        )}
      </div>
    </section>
  );
}

export function DashboardOverview({ issues }: { issues: IssueRecord[] }) {
  const open = issues.filter((issue) => issue.status === "Open").length;
  const ongoing = issues.filter((issue) => issue.status === "Ongoing").length;
  const closed = issues.filter((issue) => issue.status === "Closed").length;
  const shared = issues.filter((issue) => issue.location === "Both").length;
  const oldestOpen = issues.filter((issue) => issue.status !== "Closed").reduce((max, issue) => Math.max(max, daysOpen(issue)), 0);
  const statusValues = { Open: open, Ongoing: ongoing, Closed: closed };
  const businessValues = countBy(issues, (issue) => issue.location);

  return (
    <div className="dashboard-grid">
      <section className="panel dashboard-hero">
        <div className="panel-header">
          <h2 className="panel-title">Snapshot</h2>
          <span className="topbar-meta">{issues.length} total</span>
        </div>
        <div className="panel-body summary-grid dashboard-metrics">
          <div className="metric" style={{ "--i": 0 } as CSSProperties}>
            <strong>{open}</strong>
            <span>Open</span>
          </div>
          <div className="metric" style={{ "--i": 1 } as CSSProperties}>
            <strong>{ongoing}</strong>
            <span>Ongoing</span>
          </div>
          <div className="metric" style={{ "--i": 2 } as CSSProperties}>
            <strong>{closed}</strong>
            <span>Closed</span>
          </div>
          <div className="metric" style={{ "--i": 3 } as CSSProperties}>
            <strong>{shared}</strong>
            <span>Shared</span>
          </div>
          <div className="metric" style={{ "--i": 4 } as CSSProperties}>
            <strong>{oldestOpen}</strong>
            <span>Max open age</span>
          </div>
        </div>
      </section>
      <DonutChart title="Status mix" values={statusValues} order={["Open", "Ongoing", "Closed"]} />
      <DonutChart title="Business units" values={businessValues} order={["Vadodara", "Vapi", "Both"]} />
      <BarChart title="Aging open issues" values={agingBuckets(issues)} />
      <BarChart title="By priority" values={countBy(issues, (issue) => issue.priority)} order={["Critical", "High", "Medium", "Low"]} />
      <BarChart title="By module" values={countBy(issues, (issue) => issue.moduleName)} />
    </div>
  );
}

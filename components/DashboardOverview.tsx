import type { IssueRecord } from "@/lib/types";

function countBy<T extends string>(issues: IssueRecord[], getKey: (issue: IssueRecord) => T | null | undefined) {
  return issues.reduce<Record<string, number>>((acc, issue) => {
    const key = getKey(issue) || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function daysOpen(issue: IssueRecord) {
  const end = issue.closedAt ? new Date(issue.closedAt) : new Date();
  return Math.max(0, Math.floor((end.getTime() - new Date(issue.createdAt).getTime()) / 86_400_000));
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

function BarList({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <section className="panel dashboard-panel">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
      </div>
      <div className="panel-body bar-list">
        {entries.some(([, count]) => count > 0) ? (
          entries.map(([label, count]) => (
            <div className="bar-row" key={label}>
              <div className="bar-label">
                <span>{label}</span>
                <span>{count}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.max(8, (count / max) * 100)}%` }} />
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

  return (
    <div className="dashboard-grid">
      <section className="panel dashboard-hero">
        <div className="panel-header">
          <h2 className="panel-title">Status</h2>
          <span className="topbar-meta">{issues.length} total</span>
        </div>
        <div className="panel-body summary-grid dashboard-metrics">
          <div className="metric">
            <strong>{open}</strong>
            <span>Open</span>
          </div>
          <div className="metric">
            <strong>{ongoing}</strong>
            <span>Ongoing</span>
          </div>
          <div className="metric">
            <strong>{closed}</strong>
            <span>Closed</span>
          </div>
          <div className="metric">
            <strong>{shared}</strong>
            <span>Both BU</span>
          </div>
          <div className="metric">
            <strong>{oldestOpen}</strong>
            <span>Oldest open days</span>
          </div>
        </div>
      </section>
      <BarList title="By business units" values={countBy(issues, (issue) => issue.location)} />
      <BarList title="By module" values={countBy(issues, (issue) => issue.moduleName)} />
      <BarList title="By priority" values={countBy(issues, (issue) => issue.priority)} />
      <BarList title="Aging open issues" values={agingBuckets(issues)} />
      <BarList title="By status" values={countBy(issues, (issue) => issue.status)} />
    </div>
  );
}

"use client";

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

function barWidth(count: number, max: number) {
  if (count <= 0) return "0%";
  return `${Math.max(8, (count / max) * 100)}%`;
}

function BarList({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <div className="bar-list">
      {entries.length ? (
        entries.map(([label, count]) => (
          <div className="bar-row" key={label}>
            <div className="bar-label">
              <span>{label}</span>
              <span>{count}</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: barWidth(count, max) }} />
            </div>
          </div>
        ))
      ) : (
        <div className="muted">No data</div>
      )}
    </div>
  );
}

export function IssueSummary({ issues }: { issues: IssueRecord[] }) {
  const open = issues.filter((issue) => issue.status === "Open").length;
  const ongoing = issues.filter((issue) => issue.status === "Ongoing").length;
  const closed = issues.filter((issue) => issue.status === "Closed").length;
  const oldestOpen = issues.filter((issue) => issue.status !== "Closed").reduce((max, issue) => Math.max(max, daysOpen(issue)), 0);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Dashboard</h2>
        <span className="topbar-meta">{issues.length} total</span>
      </div>
      <div className="panel-body detail-stack">
        <div className="summary-grid">
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
            <strong>{oldestOpen}</strong>
            <span>Oldest open days</span>
          </div>
        </div>
        <BarList values={countBy(issues, (issue) => issue.location)} />
        <BarList values={countBy(issues, (issue) => issue.moduleName)} />
        <BarList values={countBy(issues, (issue) => issue.priority)} />
      </div>
    </section>
  );
}

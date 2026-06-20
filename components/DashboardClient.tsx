"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { IssueRecord, ModuleRecord } from "@/lib/types";
import { IssueForm } from "./IssueForm";
import { IssueDetail } from "./IssueDetail";
import { IssueSummary } from "./IssueSummary";
import { StatusChip } from "./StatusChip";

type FilterValue = "All" | string;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function DashboardClient({ issues, modules }: { issues: IssueRecord[]; modules: ModuleRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterValue>("All");
  const [location, setLocation] = useState<FilterValue>("All");
  const [moduleId, setModuleId] = useState<FilterValue>("All");
  const [selectedId, setSelectedId] = useState<string | null>(issues[0]?.id ?? null);

  const activeModules = modules.filter((module) => !module.archivedAt);
  const filteredIssues = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return issues.filter((issue) => {
      const matchesQuery =
        !needle ||
        issue.id.toLowerCase().includes(needle) ||
        issue.title.toLowerCase().includes(needle) ||
        issue.description.toLowerCase().includes(needle);
      const matchesStatus = status === "All" || issue.status === status;
      const matchesLocation = location === "All" || issue.location === location;
      const matchesModule = moduleId === "All" || issue.moduleId === moduleId;
      return matchesQuery && matchesStatus && matchesLocation && matchesModule;
    });
  }, [issues, location, moduleId, query, status]);

  const selectedIssue = filteredIssues.find((issue) => issue.id === selectedId) || filteredIssues[0] || null;

  return (
    <div className="workbench">
      <IssueForm modules={activeModules} />

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Issue log</h2>
          <span className="topbar-meta">{filteredIssues.length} shown</span>
        </div>
        <div className="toolbar">
          <div className="field">
            <label htmlFor="search">Search</label>
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ left: 10, position: "absolute", top: 12, color: "var(--color-muted)" }} />
              <input
                className="search-input"
                id="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="statusFilter">Status</label>
            <select id="statusFilter" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All</option>
              <option>Open</option>
              <option>Ongoing</option>
              <option>Closed</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="locationFilter">Business</label>
            <select id="locationFilter" value={location} onChange={(event) => setLocation(event.target.value)}>
              <option>All</option>
              <option>Vadodara</option>
              <option>Vapi</option>
              <option>Both</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="moduleFilter">Module</label>
            <select id="moduleFilter" value={moduleId} onChange={(event) => setModuleId(event.target.value)}>
              <option>All</option>
              {activeModules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredIssues.length ? (
          <table className="issue-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Status</th>
                <th>Business</th>
                <th>Priority</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map((issue) => (
                <tr className={`issue-row ${selectedIssue?.id === issue.id ? "selected" : ""}`} key={issue.id}>
                  <td>
                    <button className="issue-button" onClick={() => setSelectedId(issue.id)} type="button">
                      <span className="issue-id">{issue.id}</span>
                      <span className="issue-title">{issue.title}</span>
                      <span className="muted">{issue.moduleName || "No module"}</span>
                    </button>
                  </td>
                  <td>
                    <StatusChip status={issue.status} />
                  </td>
                  <td>{issue.location}</td>
                  <td>
                    <span className={`chip ${issue.priority.toLowerCase()}`}>{issue.priority}</span>
                  </td>
                  <td className="mono">{formatDate(issue.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No issues</div>
        )}
      </section>

      <aside className="detail-panel detail-stack">
        <IssueSummary issues={issues} />
        <IssueDetail issue={selectedIssue} modules={activeModules} />
      </aside>
    </div>
  );
}

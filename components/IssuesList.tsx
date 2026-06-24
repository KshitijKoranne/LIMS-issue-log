"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type { IssueRecord, ModuleRecord } from "@/lib/types";
import { IssueDetail } from "./IssueDetail";
import { StatusChip } from "./StatusChip";

type FilterValue = "All" | string;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function IssuesList({ issues, modules }: { issues: IssueRecord[]; modules: ModuleRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterValue>("All");
  const [location, setLocation] = useState<FilterValue>("All");
  const [moduleId, setModuleId] = useState<FilterValue>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeModules = useMemo(() => modules.filter((module) => !module.archivedAt), [modules]);
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

  return (
    <section className="panel issues-panel">
      <div className="panel-header">
        <h2 className="panel-title">Issues</h2>
        <span className="topbar-meta">{filteredIssues.length} shown</span>
      </div>
      <div className="toolbar">
        <div className="field">
          <label htmlFor="search">Search</label>
          <div className="search-wrap">
            <Search size={15} />
            <input className="search-input" id="search" value={query} onChange={(event) => setQuery(event.target.value)} />
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
          <label htmlFor="businessFilter">Business units</label>
          <select id="businessFilter" value={location} onChange={(event) => setLocation(event.target.value)}>
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
        <div className="issue-list">
          {filteredIssues.map((issue, index) => {
            const expanded = expandedId === issue.id;
            return (
              <article className={`issue-card ${expanded ? "expanded" : ""}`} key={issue.id} style={{ "--i": index } as CSSProperties}>
                <button className="issue-card-main" onClick={() => setExpandedId(expanded ? null : issue.id)} type="button">
                  <span className="issue-id">{issue.id}</span>
                  <span className="issue-title">{issue.title}</span>
                  <span className="muted">{issue.moduleName || "No module"}</span>
                  <span>{issue.location}</span>
                  <StatusChip status={issue.status} />
                  <span className={`chip ${issue.priority.toLowerCase()}`}>{issue.priority}</span>
                  <span className="mono">{formatDate(issue.updatedAt)}</span>
                  <span className="button ghost collapse-control">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </button>
                {expanded ? (
                  <div className="issue-expanded">
                    <IssueDetail issue={issue} modules={activeModules} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">No issues</div>
      )}
    </section>
  );
}

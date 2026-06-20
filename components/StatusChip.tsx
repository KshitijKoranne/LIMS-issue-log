import type { IssueStatus } from "@/lib/types";

export function StatusChip({ status }: { status: IssueStatus }) {
  return <span className={`chip ${status.toLowerCase()}`}>{status}</span>;
}

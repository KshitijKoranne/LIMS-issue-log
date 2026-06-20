import type { LOCATIONS, PRIORITIES, STATUSES } from "./constants";

export type IssueStatus = (typeof STATUSES)[number];
export type Location = (typeof LOCATIONS)[number];
export type Priority = (typeof PRIORITIES)[number];

export type ModuleRecord = {
  id: string;
  name: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttachmentRecord = {
  id: string;
  issueId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
  createdAt: string;
};

export type IssueRecord = {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  location: Location;
  moduleId: string | null;
  moduleName: string | null;
  priority: Priority;
  aiCategory: string | null;
  aiSubcategory: string | null;
  aiSummary: string | null;
  aiConfidence: number | null;
  aiProcessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  attachments: AttachmentRecord[];
};

export type DashboardData = {
  configured: boolean;
  issues: IssueRecord[];
  modules: ModuleRecord[];
};

export type ActionState = {
  ok: boolean;
  message: string;
};

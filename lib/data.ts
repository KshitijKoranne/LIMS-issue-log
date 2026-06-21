import { unstable_cache } from "next/cache";
import { ensureSchema, getClient, isDbConfigured } from "./db";
import type { AttachmentRecord, DashboardData, IssueRecord, ModuleRecord } from "./types";

type DbRow = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function mapModule(row: DbRow): ModuleRecord {
  return {
    id: text(row.id),
    name: text(row.name),
    archivedAt: nullableText(row.archived_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at)
  };
}

function mapAttachment(row: DbRow): AttachmentRecord {
  return {
    id: text(row.id),
    issueId: text(row.issue_id),
    filename: text(row.filename),
    mimeType: text(row.mime_type),
    sizeBytes: numberValue(row.size_bytes),
    dataBase64: text(row.data_base64),
    createdAt: text(row.created_at)
  };
}

function mapAttachmentMeta(row: DbRow): AttachmentRecord {
  return {
    ...mapAttachment(row),
    dataBase64: ""
  };
}

function mapIssue(row: DbRow, attachments: AttachmentRecord[]): IssueRecord {
  return {
    id: text(row.id),
    title: text(row.title),
    description: text(row.description),
    status: text(row.status) as IssueRecord["status"],
    location: text(row.location) as IssueRecord["location"],
    moduleId: nullableText(row.module_id),
    moduleName: nullableText(row.module_name),
    priority: text(row.priority) as IssueRecord["priority"],
    aiCategory: nullableText(row.ai_category),
    aiSubcategory: nullableText(row.ai_subcategory),
    aiSummary: nullableText(row.ai_summary),
    aiConfidence: row.ai_confidence === null || row.ai_confidence === undefined ? null : numberValue(row.ai_confidence),
    aiProcessedAt: nullableText(row.ai_processed_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: nullableText(row.closed_at),
    attachments
  };
}

async function readDashboardData(): Promise<DashboardData> {
  await ensureSchema();
  const db = getClient();
  const [issueRows, moduleRows, attachmentRows] = await Promise.all([
    db.execute(`
      SELECT
        issues.*,
        COALESCE(modules.name, issues.module_name_snapshot) AS module_name
      FROM issues
      LEFT JOIN modules ON modules.id = issues.module_id
      ORDER BY datetime(issues.updated_at) DESC
    `),
    db.execute("SELECT * FROM modules ORDER BY archived_at IS NOT NULL, lower(name) ASC"),
    db.execute(`
      SELECT id, issue_id, filename, mime_type, size_bytes, '' AS data_base64, created_at
      FROM issue_attachments
      ORDER BY datetime(created_at) DESC
    `)
  ]);

  const attachments = attachmentRows.rows.map((row) => mapAttachmentMeta(row as DbRow));
  const attachmentMap = new Map<string, AttachmentRecord[]>();
  for (const attachment of attachments) {
    const current = attachmentMap.get(attachment.issueId) || [];
    current.push(attachment);
    attachmentMap.set(attachment.issueId, current);
  }

  return {
    configured: true,
    modules: moduleRows.rows.map((row) => mapModule(row as DbRow)),
    issues: issueRows.rows.map((row) => {
      const issueId = text((row as DbRow).id);
      return mapIssue(row as DbRow, attachmentMap.get(issueId) || []);
    })
  };
}

export async function getIssueAttachments(issueId: string): Promise<{ configured: boolean; attachments: AttachmentRecord[] }> {
  if (!isDbConfigured()) {
    return { configured: false, attachments: [] };
  }

  await ensureSchema();
  const rows = await getClient().execute({
    sql: `
      SELECT id, issue_id, filename, mime_type, size_bytes, data_base64, created_at
      FROM issue_attachments
      WHERE issue_id = ?
      ORDER BY datetime(created_at) DESC
    `,
    args: [issueId]
  });

  return {
    configured: true,
    attachments: rows.rows.map((row) => mapAttachment(row as DbRow))
  };
}

const getCachedDashboardData = unstable_cache(readDashboardData, ["lims-dashboard-data-v2"], {
  revalidate: 30,
  tags: ["lims-data"]
});

export async function getDashboardData(): Promise<DashboardData> {
  if (!isDbConfigured()) {
    return { configured: false, issues: [], modules: [] };
  }

  return getCachedDashboardData();
}

export async function getModules(): Promise<{ configured: boolean; modules: ModuleRecord[] }> {
  if (!isDbConfigured()) {
    return { configured: false, modules: [] };
  }

  const data = await getDashboardData();
  return { configured: data.configured, modules: data.modules };
}

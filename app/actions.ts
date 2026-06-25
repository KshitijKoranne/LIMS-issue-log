"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ACCEPTED_IMAGE_TYPES, LOCATIONS, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_SUBMISSION, PRIORITIES, STATUSES } from "@/lib/constants";
import { getClient, ensureSchema, isDbConfigured } from "@/lib/db";
import { getIssueAttachments as readIssueAttachments } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import type { ActionState, AttachmentRecord, IssueStatus, Location, Priority } from "@/lib/types";

function now() {
  return new Date().toISOString();
}

function asEnum<T extends readonly string[]>(value: FormDataEntryValue | null, allowed: T, fallback: T[number]) {
  const text = String(value || "");
  return allowed.includes(text) ? (text as T[number]) : fallback;
}

function normalizeText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function formatIssueId(nextValue: number) {
  return `ISS-${String(nextValue).padStart(4, "0")}`;
}

function dbMissing(): ActionState | null {
  return isDbConfigured() ? null : { ok: false, message: "Turso env vars are missing." };
}

function revalidateIssueViews() {
  revalidateTag("lims-data");
  revalidatePath("/");
  revalidatePath("/issues");
  revalidatePath("/assistant");
}

function revalidateAllViews() {
  revalidateTag("lims-data");
  revalidatePath("/");
  revalidatePath("/issues");
  revalidatePath("/issues/new");
  revalidatePath("/settings/modules");
  revalidatePath("/assistant");
}

async function readAttachments(formData: FormData) {
  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  const accepted = files.slice(0, MAX_ATTACHMENTS_PER_SUBMISSION);

  return Promise.all(
    accepted.map(async (file) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        throw new Error(`${file.name} is not a supported image.`);
      }

      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new Error(`${file.name} is too large after compression.`);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      return {
        id: crypto.randomUUID(),
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        dataBase64: buffer.toString("base64"),
        createdAt: now()
      };
    })
  );
}

async function resolveModule(moduleId: string | null, activeOnly: boolean) {
  if (!moduleId) {
    return { id: null, name: null };
  }

  const result = await getClient().execute({
    sql: activeOnly ? "SELECT id, name FROM modules WHERE id = ? AND archived_at IS NULL" : "SELECT id, name FROM modules WHERE id = ?",
    args: [moduleId]
  });

  const row = result.rows[0];
  return {
    id: row?.id ? String(row.id) : null,
    name: row?.name ? String(row.name) : null
  };
}

async function issueExists(issueId: string) {
  const result = await getClient().execute({ sql: "SELECT id FROM issues WHERE id = ?", args: [issueId] });
  return Boolean(result.rows.length);
}

async function nextIssueId() {
  const sequence = await getClient().execute("UPDATE issue_sequence SET next_value = next_value + 1 WHERE id = 'issue' RETURNING next_value - 1 AS issued_value");
  const nextValue = Number(sequence.rows[0]?.issued_value || 1);
  return formatIssueId(nextValue);
}

export async function createIssue(formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const title = normalizeText(formData.get("title"));
  const description = normalizeText(formData.get("description"));
  const location = asEnum(formData.get("location"), LOCATIONS, "Vadodara") as Location;
  const priority = asEnum(formData.get("priority"), PRIORITIES, "Medium") as Priority;
  const moduleId = normalizeText(formData.get("moduleId")) || null;

  if (!title || !description) {
    return { ok: false, message: "Title and description are required." };
  }

  await ensureSchema();
  const db = getClient();
  const module = await resolveModule(moduleId, true);
  if (moduleId && !module.id) {
    return { ok: false, message: "Selected module is unavailable." };
  }

  let attachments;
  try {
    attachments = await readAttachments(formData);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Attachment failed." };
  }

  const id = await nextIssueId();
  const timestamp = now();

  try {
    await db.execute({
      sql: `
        INSERT INTO issues (
          id, title, description, status, location, module_id, module_name_snapshot, priority,
          created_at, updated_at, closed_at
        ) VALUES (?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, NULL)
      `,
      args: [id, title, description, location, module.id, module.name, priority, timestamp, timestamp]
    });

    for (const attachment of attachments) {
      await db.execute({
        sql: `
          INSERT INTO issue_attachments (id, issue_id, filename, mime_type, size_bytes, data_base64, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [attachment.id, id, attachment.filename, attachment.mimeType, attachment.sizeBytes, attachment.dataBase64, attachment.createdAt]
      });
    }
  } catch (error) {
    console.error("Issue creation failed", error);
    return { ok: false, message: "Issue could not be saved." };
  }

  revalidateIssueViews();
  return { ok: true, message: `${id} logged.` };
}

export async function getIssueAttachments(issueId: string): Promise<{ ok: boolean; message: string; attachments: AttachmentRecord[] }> {
  await requireSession();
  const normalizedIssueId = String(issueId || "").trim();
  if (!normalizedIssueId) {
    return { ok: false, message: "Issue is required.", attachments: [] };
  }

  try {
    const result = await readIssueAttachments(normalizedIssueId);
    if (!result.configured) {
      return { ok: false, message: "Turso env vars are missing.", attachments: [] };
    }
    return { ok: true, message: "", attachments: result.attachments };
  } catch {
    return { ok: false, message: "Screenshots could not be loaded.", attachments: [] };
  }
}

export async function updateIssue(formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const id = normalizeText(formData.get("id"));
  const title = normalizeText(formData.get("title"));
  const description = normalizeText(formData.get("description"));
  const status = asEnum(formData.get("status"), STATUSES, "Open") as IssueStatus;
  const location = asEnum(formData.get("location"), LOCATIONS, "Vadodara") as Location;
  const priority = asEnum(formData.get("priority"), PRIORITIES, "Medium") as Priority;
  const moduleId = normalizeText(formData.get("moduleId")) || null;

  if (!id || !title || !description) {
    return { ok: false, message: "Issue, title, and description are required." };
  }

  await ensureSchema();
  const db = getClient();
  const existingIssue = await db.execute({
    sql: "SELECT closed_at FROM issues WHERE id = ?",
    args: [id]
  });

  if (!existingIssue.rows.length) {
    return { ok: false, message: `${id} was not found.` };
  }

  const module = await resolveModule(moduleId, false);
  if (moduleId && !module.id) {
    return { ok: false, message: "Selected module is unavailable." };
  }

  const timestamp = now();
  const existingClosedAt = existingIssue.rows[0]?.closed_at ? String(existingIssue.rows[0].closed_at) : null;
  const closedAt = status === "Closed" ? existingClosedAt || timestamp : null;

  try {
    await db.execute({
      sql: `
        UPDATE issues
        SET title = ?, description = ?, status = ?, location = ?, priority = ?, module_id = ?,
            module_name_snapshot = ?, updated_at = ?, closed_at = ?
        WHERE id = ?
      `,
      args: [title, description, status, location, priority, module.id, module.name, timestamp, closedAt, id]
    });
  } catch (error) {
    console.error("Issue update failed", error);
    return { ok: false, message: "Issue could not be updated." };
  }

  revalidateIssueViews();
  return { ok: true, message: `${id} updated.` };
}

export async function closeIssue(formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const id = normalizeText(formData.get("id"));
  if (!id) {
    return { ok: false, message: "Issue is required." };
  }

  await ensureSchema();
  const timestamp = now();

  try {
    const result = await getClient().execute({
      sql: `
        UPDATE issues
        SET status = 'Closed', updated_at = ?, closed_at = COALESCE(closed_at, ?)
        WHERE id = ?
      `,
      args: [timestamp, timestamp, id]
    });

    if (Number(result.rowsAffected || 0) === 0) {
      return { ok: false, message: `${id} was not found.` };
    }
  } catch (error) {
    console.error("Issue close failed", error);
    return { ok: false, message: "Issue could not be closed." };
  }

  revalidateIssueViews();
  return { ok: true, message: `${id} closed.` };
}

export async function addAttachments(formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const issueId = normalizeText(formData.get("issueId"));
  if (!issueId) {
    return { ok: false, message: "Issue is required." };
  }

  let attachments;
  try {
    attachments = await readAttachments(formData);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Attachment failed." };
  }

  if (!attachments.length) {
    return { ok: false, message: "Select at least one screenshot." };
  }

  await ensureSchema();
  const db = getClient();
  if (!(await issueExists(issueId))) {
    return { ok: false, message: `${issueId} was not found.` };
  }

  try {
    for (const attachment of attachments) {
      await db.execute({
        sql: `
          INSERT INTO issue_attachments (id, issue_id, filename, mime_type, size_bytes, data_base64, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [attachment.id, issueId, attachment.filename, attachment.mimeType, attachment.sizeBytes, attachment.dataBase64, attachment.createdAt]
      });
    }

    await db.execute({ sql: "UPDATE issues SET updated_at = ? WHERE id = ?", args: [now(), issueId] });
  } catch (error) {
    console.error("Attachment upload failed", error);
    return { ok: false, message: "Screenshots could not be saved." };
  }

  revalidateIssueViews();
  return { ok: true, message: "Screenshots added." };
}

export async function deleteAttachment(formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const id = normalizeText(formData.get("id"));
  if (!id) {
    return { ok: false, message: "Attachment is required." };
  }

  await ensureSchema();
  const attachment = await getClient().execute({ sql: "SELECT id FROM issue_attachments WHERE id = ?", args: [id] });
  if (!attachment.rows.length) {
    return { ok: false, message: "Screenshot was not found." };
  }

  await getClient().execute({ sql: "DELETE FROM issue_attachments WHERE id = ?", args: [id] });
  revalidateIssueViews();
  return { ok: true, message: "Screenshot deleted." };
}

export async function createModule(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const name = normalizeText(formData.get("name"));
  if (!name) {
    return { ok: false, message: "Module name is required." };
  }

  await ensureSchema();
  const timestamp = now();
  try {
    await getClient().execute({
      sql: "INSERT INTO modules (id, name, archived_at, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)",
      args: [crypto.randomUUID(), name, timestamp, timestamp]
    });
  } catch {
    return { ok: false, message: "Module already exists." };
  }

  revalidateAllViews();
  return { ok: true, message: "Module added." };
}

export async function renameModule(formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const id = normalizeText(formData.get("id"));
  const name = normalizeText(formData.get("name"));
  if (!id || !name) {
    return { ok: false, message: "Module and name are required." };
  }

  await ensureSchema();
  try {
    await getClient().execute({
      sql: "UPDATE modules SET name = ?, updated_at = ? WHERE id = ?",
      args: [name, now(), id]
    });
  } catch {
    return { ok: false, message: "Module name is already in use." };
  }

  revalidateAllViews();
  return { ok: true, message: "Module renamed." };
}

export async function archiveModule(formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const id = normalizeText(formData.get("id"));
  if (!id) {
    return { ok: false, message: "Module is required." };
  }

  await ensureSchema();
  await getClient().execute({
    sql: "UPDATE modules SET archived_at = COALESCE(archived_at, ?), updated_at = ? WHERE id = ?",
    args: [now(), now(), id]
  });

  revalidateAllViews();
  return { ok: true, message: "Module archived." };
}

export async function restoreModule(formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const id = normalizeText(formData.get("id"));
  if (!id) {
    return { ok: false, message: "Module is required." };
  }

  await ensureSchema();
  await getClient().execute({
    sql: "UPDATE modules SET archived_at = NULL, updated_at = ? WHERE id = ?",
    args: [now(), id]
  });

  revalidateAllViews();
  return { ok: true, message: "Module restored." };
}

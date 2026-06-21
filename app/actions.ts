"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ACCEPTED_IMAGE_TYPES, LOCATIONS, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_SUBMISSION, PRIORITIES, STATUSES } from "@/lib/constants";
import { getClient, ensureSchema, isDbConfigured } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import type { ActionState, IssueStatus, Location, Priority } from "@/lib/types";

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
  const moduleResult = moduleId
    ? await db.execute({ sql: "SELECT id, name FROM modules WHERE id = ? AND archived_at IS NULL", args: [moduleId] })
    : null;
  const resolvedModuleId = moduleResult?.rows[0]?.id ? String(moduleResult.rows[0].id) : null;
  const moduleNameSnapshot = moduleResult?.rows[0]?.name ? String(moduleResult.rows[0].name) : null;

  let attachments;
  try {
    attachments = await readAttachments(formData);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Attachment failed." };
  }

  const sequence = await db.execute("SELECT next_value FROM issue_sequence WHERE id = 'issue'");
  const nextValue = Number(sequence.rows[0]?.next_value || 1);
  const id = formatIssueId(nextValue);
  const timestamp = now();

  await db.execute({ sql: "UPDATE issue_sequence SET next_value = ? WHERE id = 'issue'", args: [nextValue + 1] });
  await db.execute({
    sql: `
      INSERT INTO issues (
        id, title, description, status, location, module_id, module_name_snapshot, priority,
        created_at, updated_at, closed_at
      ) VALUES (?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, NULL)
    `,
    args: [id, title, description, location, resolvedModuleId, moduleNameSnapshot, priority, timestamp, timestamp]
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

  revalidateIssueViews();
  return { ok: true, message: `${id} logged.` };
}

export async function updateIssue(formData: FormData): Promise<ActionState> {
  await requireSession();
  const missing = dbMissing();
  if (missing) return missing;

  const id = normalizeText(formData.get("id"));
  const title = normalizeText(formData.get("title"));
  const description = normalizeText(formData.get("description"));
  const status = asEnum(formData.get("status"), STATUSES, "Open") as IssueStatus;
  const priority = asEnum(formData.get("priority"), PRIORITIES, "Medium") as Priority;
  const moduleId = normalizeText(formData.get("moduleId")) || null;

  if (!id || !title || !description) {
    return { ok: false, message: "Issue, title, and description are required." };
  }

  await ensureSchema();
  const db = getClient();
  const moduleResult = moduleId
    ? await db.execute({ sql: "SELECT id, name FROM modules WHERE id = ? AND archived_at IS NULL", args: [moduleId] })
    : null;
  const resolvedModuleId = moduleResult?.rows[0]?.id ? String(moduleResult.rows[0].id) : null;
  const moduleNameSnapshot = moduleResult?.rows[0]?.name ? String(moduleResult.rows[0].name) : null;
  const timestamp = now();
  const closedAt = status === "Closed" ? timestamp : null;

  await db.execute({
    sql: `
      UPDATE issues
      SET title = ?, description = ?, status = ?, priority = ?, module_id = ?,
          module_name_snapshot = ?, updated_at = ?, closed_at = ?
      WHERE id = ?
    `,
    args: [title, description, status, priority, resolvedModuleId, moduleNameSnapshot, timestamp, closedAt, id]
  });

  revalidateIssueViews();
  return { ok: true, message: `${id} updated.` };
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

  await ensureSchema();
  const db = getClient();
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
  await getClient().execute({
    sql: "UPDATE modules SET name = ?, updated_at = ? WHERE id = ?",
    args: [name, now(), id]
  });

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

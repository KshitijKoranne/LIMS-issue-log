"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Save, Trash2 } from "lucide-react";
import { addAttachments, deleteAttachment, getIssueAttachments, updateIssue } from "@/app/actions";
import type { AttachmentRecord, IssueRecord, ModuleRecord } from "@/lib/types";
import { StatusChip } from "./StatusChip";

async function compressImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
  return blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }) : file;
}

export function IssueDetail({ issue, modules }: { issue: IssueRecord | null; modules: ModuleRecord[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentRecord[]>(issue?.attachments || []);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!issue) return;

    let cancelled = false;
    setAttachments(issue.attachments);
    if (!issue.attachments.length) return;

    setAttachmentsLoading(true);
    getIssueAttachments(issue.id)
      .then((result) => {
        if (!cancelled && result.ok) {
          setAttachments(result.attachments);
        }
        if (!cancelled && !result.ok) {
          setMessage(result.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAttachmentsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [issue]);

  if (!issue) {
    return (
      <section className="panel">
        <div className="empty-state">No issue selected</div>
      </section>
    );
  }

  const currentIssue = issue;

  function submitUpdate(formData: FormData) {
    startTransition(async () => {
      const result = await updateIssue(formData);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  async function submitAttachments(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData();
    data.set("issueId", currentIssue.id);
    const files = Array.from(fileRef.current?.files || []).slice(0, 3);
    const compressed = await Promise.all(files.map((file) => compressImage(file)));
    for (const file of compressed) data.append("attachments", file);
    startTransition(async () => {
      const result = await addAttachments(data);
      setMessage(result.message);
      if (result.ok) {
        event.currentTarget.reset();
        const refreshed = await getIssueAttachments(currentIssue.id);
        if (refreshed.ok) {
          setAttachments(refreshed.attachments);
        }
        router.refresh();
      }
    });
  }

  function submitDelete(id: string) {
    const data = new FormData();
    data.set("id", id);
    startTransition(async () => {
      const result = await deleteAttachment(data);
      setMessage(result.message);
      if (result.ok) {
        setAttachments((current) => current.filter((attachment) => attachment.id !== id));
        router.refresh();
      }
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{currentIssue.id}</h2>
          <div className="topbar-meta">{currentIssue.location}</div>
        </div>
        <StatusChip status={currentIssue.status} />
      </div>
      <div className="panel-body detail-stack">
        <form action={submitUpdate} className="form-grid">
          <input name="id" type="hidden" value={currentIssue.id} />
          <div className="field">
            <label htmlFor="detailTitle">Title</label>
            <input id="detailTitle" name="title" defaultValue={currentIssue.title} required />
          </div>
          <div className="field">
            <label htmlFor="detailDescription">Issue</label>
            <textarea id="detailDescription" name="description" defaultValue={currentIssue.description} required />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="detailStatus">Status</label>
              <select id="detailStatus" name="status" defaultValue={currentIssue.status}>
                <option>Open</option>
                <option>Ongoing</option>
                <option>Closed</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="detailPriority">Priority</label>
              <select id="detailPriority" name="priority" defaultValue={currentIssue.priority}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="detailModule">Module</label>
            <select id="detailModule" name="moduleId" defaultValue={currentIssue.moduleId || ""}>
              <option value="">Unassigned</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </select>
          </div>
          <button className="button full" disabled={pending} type="submit">
            <Save size={16} />
            Save
          </button>
        </form>

        <form className="form-grid" onSubmit={submitAttachments}>
          <label className="dropzone" htmlFor="detailScreenshots">
            <ImagePlus size={18} />
            <span>Add screenshots</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              id="detailScreenshots"
              multiple
              ref={fileRef}
              style={{ display: "none" }}
              type="file"
            />
          </label>
          <button className="button full" disabled={pending} type="submit">
            Upload
          </button>
        </form>

        {attachmentsLoading ? (
          <div className="empty-state loading-state" aria-label="Loading screenshots" role="status">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        ) : null}

        {attachments.length ? (
          <div className="attachment-grid">
            {attachments.map((attachment) => (
              <div className="attachment" key={attachment.id}>
                {attachment.dataBase64 ? (
                  <img alt={attachment.filename} src={`data:${attachment.mimeType};base64,${attachment.dataBase64}`} />
                ) : (
                  <div className="attachment-placeholder" aria-hidden="true" />
                )}
                <div>
                  <div className="issue-title">{attachment.filename}</div>
                  <div className="topbar-meta">{Math.round(attachment.sizeBytes / 1024)} KB</div>
                </div>
                <button className="button ghost danger" disabled={pending} onClick={() => submitDelete(attachment.id)} type="button">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {message ? <div className={message.includes("updated") || message.includes("added") || message.includes("deleted") ? "success" : "error"}>{message}</div> : null}
      </div>
    </section>
  );
}

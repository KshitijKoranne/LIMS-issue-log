"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Plus } from "lucide-react";
import { createIssue } from "@/app/actions";
import type { ModuleRecord } from "@/lib/types";

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
    if (!blob) {
      return file;
    }

    const filename = file.name.replace(/\.[^.]+$/, ".webp");
    return new File([blob], filename, { type: "image/webp" });
  } catch {
    return file;
  }
}

export function IssueForm({ modules }: { modules: ModuleRecord[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [pending, startTransition] = useTransition();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.delete("screenshots");
    const files = Array.from(fileRef.current?.files || []).slice(0, 3);
    const compressed = await Promise.all(files.map((file) => compressImage(file)));
    for (const file of compressed) {
      data.append("attachments", file);
    }

    startTransition(async () => {
      const result = await createIssue(data);
      setMessage(result.message);
      if (result.ok) {
        formRef.current?.reset();
        setFileCount(0);
        router.refresh();
      }
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Log issue</h2>
        <Plus size={18} />
      </div>
      <form className="panel-body form-grid" onSubmit={onSubmit} ref={formRef}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required />
        </div>
        <div className="field">
          <label htmlFor="description">Issue</label>
          <textarea id="description" name="description" required />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="location">Business units</label>
            <select id="location" name="location" defaultValue="Vadodara">
              <option>Vadodara</option>
              <option>Vapi</option>
              <option>Both</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select id="priority" name="priority" defaultValue="Medium">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="moduleId">Module</label>
          <select id="moduleId" name="moduleId" defaultValue="">
            <option value="">Unassigned</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
        </div>
        <label className="dropzone" htmlFor="screenshots">
          <Paperclip size={18} />
          <span>{fileCount ? `${fileCount} selected` : "Screenshots"}</span>
          <input
            accept="image/png,image/jpeg,image/webp"
            id="screenshots"
            multiple
            name="screenshots"
            onChange={(event) => setFileCount(event.target.files?.length || 0)}
            ref={fileRef}
            style={{ display: "none" }}
            type="file"
          />
        </label>
        {message ? <div className={message.includes("logged") ? "success" : "error"}>{message}</div> : null}
        <button className="button primary full" disabled={pending} type="submit">
          {pending ? "Logging" : "Log issue"}
        </button>
      </form>
    </section>
  );
}

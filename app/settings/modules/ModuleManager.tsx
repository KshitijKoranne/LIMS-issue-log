"use client";

import { useActionState, useTransition } from "react";
import { Archive, RotateCcw, Save } from "lucide-react";
import { archiveModule, createModule, renameModule, restoreModule } from "@/app/actions";
import type { ModuleRecord } from "@/lib/types";

const initialState = { ok: false, message: "" };

export function ModuleManager({ modules }: { modules: ModuleRecord[] }) {
  const [state, formAction, createPending] = useActionState(createModule, initialState);
  const [pending, startTransition] = useTransition();

  function submitAction(action: (formData: FormData) => Promise<{ ok: boolean; message: string }>, formData: FormData) {
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <div className="workbench" style={{ gridTemplateColumns: "minmax(320px, 0.55fr) minmax(0, 1fr)" }}>
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">New module</h2>
        </div>
        <form action={formAction} className="panel-body form-grid">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required />
          </div>
          {state.message ? <div className={state.ok ? "success" : "error"}>{state.message}</div> : null}
          <button className="button primary full" disabled={createPending} type="submit">
            Add module
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Modules</h2>
          <span className="topbar-meta">{modules.length} total</span>
        </div>
        <div className="panel-body module-list">
          {modules.length ? (
            modules.map((module) => (
              <form action={(formData) => submitAction(renameModule, formData)} className="module-item" key={module.id}>
                <input name="id" type="hidden" value={module.id} />
                <div className="field">
                  <label htmlFor={`module-${module.id}`}>{module.archivedAt ? "Archived" : "Active"}</label>
                  <input id={`module-${module.id}`} name="name" defaultValue={module.name} disabled={Boolean(module.archivedAt)} />
                </div>
                <button className="button" disabled={pending || Boolean(module.archivedAt)} type="submit">
                  <Save size={15} />
                  Save
                </button>
                <button
                  className="button"
                  disabled={pending}
                  formAction={(formData) => submitAction(module.archivedAt ? restoreModule : archiveModule, formData)}
                  type="submit"
                >
                  {module.archivedAt ? <RotateCcw size={15} /> : <Archive size={15} />}
                  {module.archivedAt ? "Restore" : "Archive"}
                </button>
              </form>
            ))
          ) : (
            <div className="empty-state">No modules</div>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { loginAction } from "./actions";

const initialState = { ok: false, message: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="panel login-card">
      <div className="panel-header">
        <div className="login-brand">
          <Image className="app-mark" src="/compliance.png" alt="" width={42} height={42} priority />
          <div>
            <h1 className="panel-title">LIMS Issues</h1>
            <div className="topbar-meta">private access</div>
          </div>
        </div>
        <LockKeyhole size={18} />
      </div>
      <div className="panel-body form-grid">
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.message ? <div className="error">{state.message}</div> : null}
        <button className="button primary full" disabled={pending} type="submit">
          {pending ? "Checking" : "Enter"}
        </button>
      </div>
    </form>
  );
}

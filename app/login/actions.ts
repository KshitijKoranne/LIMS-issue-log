"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") || "");
  const appPassword = process.env.APP_PASSWORD || "";

  if (!appPassword) {
    return { ok: false, message: "APP_PASSWORD is not configured." };
  }

  if (password !== appPassword) {
    return { ok: false, message: "Password rejected." };
  }

  await setSessionCookie();
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; firstAt: number }>();

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function passwordsMatch(actual: string, expected: string) {
  return timingSafeEqual(digest(actual), digest(expected));
}

async function attemptKey() {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function isLimited(key: string) {
  const current = attempts.get(key);
  if (!current) return false;
  if (Date.now() - current.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return current.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const current = attempts.get(key);
  if (!current || Date.now() - current.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  attempts.set(key, { count: current.count + 1, firstAt: current.firstAt });
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") || "");
  const appPassword = process.env.APP_PASSWORD || "";
  const key = await attemptKey();

  if (!appPassword) {
    return { ok: false, message: "APP_PASSWORD is not configured." };
  }

  if (isLimited(key)) {
    return { ok: false, message: "Too many attempts. Try again later." };
  }

  if (!passwordsMatch(password, appPassword)) {
    recordFailure(key);
    return { ok: false, message: "Password rejected." };
  }

  attempts.delete(key);
  await setSessionCookie();
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

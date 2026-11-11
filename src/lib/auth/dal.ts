import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Data Access Layer for identity. Every page and Server Action that needs to
 * know who is calling goes through here; the proxy's redirect is only an
 * optimistic first pass.
 */

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
}

/** The verified current user, or null. Memoised per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  // getUser() asks the Auth server to validate the token; the cookie alone is
  // not proof of identity.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    // A missing profile row means the sign-up trigger has not run yet; the
    // least-privileged role is the only safe default.
    role: profile?.role ?? "learner",
  };
});

/** For pages: the signed-in user, or a redirect to /login. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** For pages: an admin, or a 404 — a learner should not learn the admin area exists. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}

/** For Server Actions: the admin, or null so the action can refuse with a message. */
export async function authorizeAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === "admin" ? user : null;
}

/** Where to send someone after they sign in, absent a `next` parameter. */
export function homeFor(user: Pick<SessionUser, "role">): string {
  return user.role === "admin" ? "/admin/charts" : "/practice";
}

/**
 * A `next` parameter is user-controlled; only same-site paths are honoured so
 * the login page cannot be used as an open redirect.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
}

/**
 * The signed-in user, verified with the Auth server (getUser, not the cookie
 * alone), plus their role from `profiles`. Memoised per request.
 *
 * This is the authorization source of truth for pages and actions. The proxy
 * only does optimistic redirects; RLS enforces the same rules in Postgres.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    // A missing profile row is treated as the least-privileged role.
    role: profile?.role ?? "learner",
  };
});

/** For pages: signed-in users only, otherwise to /login and back. */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/**
 * For admin pages: a learner gets a 404, not a "forbidden", so the admin
 * surface is not advertised.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin/charts");
  if (user.role !== "admin") notFound();
  return user;
}

/** For Server Actions: never redirects, so the caller can return an error. */
export async function getAdminOrNull(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === "admin" ? user : null;
}

/** Where a user lands after signing in when no `next` was requested. */
export function homeFor(role: AppRole): string {
  return role === "admin" ? "/admin/charts" : "/practice";
}

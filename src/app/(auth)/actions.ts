"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor, safeNextPath } from "@/lib/auth/dal";
import { signInSchema, signUpSchema } from "@/lib/auth/schemas";
import { errorState, formObject, successState, validationError, type ActionState } from "@/lib/forms";

/** Absolute origin for auth redirect links. A configured site URL wins over request headers. */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return errorState("Confirm your email first — the link is in your inbox.");
    }
    // One message for every credential failure, so the form does not reveal
    // which emails have accounts.
    return errorState("That email and password do not match an account.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  redirect(safeNextPath(parsed.data.next) ?? homeFor({ role: profile?.role ?? "learner" }));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/practice`,
      // Name only. The role is never taken from sign-up metadata.
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    if (error.code === "weak_password") return errorState(error.message);
    return errorState("Could not create the account. Try again, or sign in if you already have one.");
  }

  // With email confirmation off (local development) Supabase signs the user
  // straight in; otherwise they confirm from their inbox first.
  if (data.session) redirect("/practice");
  return successState(`Check ${parsed.data.email} for a confirmation link to finish signing up.`);
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNextPath(formData.get("next")) ?? "";
  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
    },
  });

  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

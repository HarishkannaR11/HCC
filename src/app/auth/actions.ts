"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/redirects";
import { homeFor } from "@/lib/auth/session";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
  message?: string;
  email?: string;
}

const signInSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
  next: z.string().max(512).optional(),
});

export async function signInWithPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: "Enter your email address and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    const message =
      error?.code === "email_not_confirmed"
        ? "Confirm your email address first. The link is in your inbox."
        : "That email and password do not match an account.";
    return { error: message, email: parsed.data.email };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  redirect(safeNextPath(parsed.data.next, homeFor(profile?.role ?? "learner")));
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export async function signUpWithPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form.", email: String(formData.get("email") ?? "") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the handle_new_user trigger. Role is never taken from here.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/practice`,
    },
  });
  if (error) {
    const message =
      error.code === "weak_password"
        ? "Choose a stronger password."
        : error.code === "user_already_exists"
          ? "An account with that email already exists. Log in instead."
          : "We could not create your account. Try again.";
    return { error: message, email: parsed.data.email };
  }

  // Email confirmation off (local dev): signed in immediately.
  if (data.session) redirect("/practice");
  return { message: "Check your inbox for a confirmation link to finish signing up." };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNextPath(formData.get("next"), "");
  const callback = new URL("/auth/callback", siteUrl());
  if (next) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

"use client";

import { useActionState } from "react";
import { signUpWithPassword, type AuthFormState } from "@/app/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signUpWithPassword, {});

  if (state.message) return <Alert variant="info">{state.message}</Alert>;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required maxLength={120} autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        <p className="m-0 text-xs text-muted">At least 8 characters.</p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

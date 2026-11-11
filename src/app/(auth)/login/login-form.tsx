"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, fieldError } from "@/components/form-parts";
import { IDLE } from "@/lib/forms";
import { signIn } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, IDLE);

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={fieldError(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state.status === "error" && !state.fieldErrors ? <FormMessage state={state} /> : null}
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

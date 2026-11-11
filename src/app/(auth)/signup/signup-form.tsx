"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, fieldError } from "@/components/form-parts";
import { IDLE } from "@/lib/forms";
import { signUp } from "../actions";

export function SignupForm() {
  const [state, action] = useActionState(signUp, IDLE);

  if (state.status === "success") return <FormMessage state={state} />;

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Field label="Name" htmlFor="fullName" error={fieldError(state, "fullName")}>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={fieldError(state, "password")}
        hint="At least 8 characters."
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      {state.status === "error" && !state.fieldErrors ? <FormMessage state={state} /> : null}
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}

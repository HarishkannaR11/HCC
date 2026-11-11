"use client";

import { createContext, useActionState, useContext, useEffect, useRef } from "react";
import { FormMessage } from "@/components/form-parts";
import { IDLE, type ActionState } from "@/lib/forms";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const ActionStateContext = createContext<ActionState>(IDLE);

/**
 * A <form> bound to a Server Action through useActionState. Children can be
 * server-rendered markup; <FieldErrorText> and <ConfirmSubmit> read the action
 * state from context. `resetOnSuccess` clears "add" forms after a save.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  showMessage = true,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  showMessage?: boolean;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") formRef.current?.reset();
  }, [resetOnSuccess, state]);

  return (
    <ActionStateContext.Provider value={state}>
      <form ref={formRef} action={formAction} className={className} noValidate>
        {children}
        {showMessage ? (
          <div className="basis-full empty:hidden">
            <FormMessage state={state} />
          </div>
        ) : null}
      </form>
    </ActionStateContext.Provider>
  );
}

/** Inline error for one field of the surrounding ActionForm. */
export function FieldErrorText({ name }: { name: string }) {
  const state = useContext(ActionStateContext);
  const message = state.status === "error" ? state.fieldErrors?.[name] : undefined;
  return message ? <p className="text-[12px] text-danger-ink">{message}</p> : null;
}

/** A submit button that asks first. For deletes. */
export function ConfirmSubmit({
  message,
  children,
  className,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

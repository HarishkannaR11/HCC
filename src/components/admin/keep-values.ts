import { startTransition, type FormEvent, type MouseEvent } from "react";

/**
 * React 19 resets a form's uncontrolled fields after every form action, even
 * one that returns validation errors, which would wipe what the author typed.
 * Dispatching from onSubmit inside a transition runs the same action without
 * the reset. The form keeps its `action` attribute, so it still works with
 * JavaScript disabled.
 */
export function submitKeepingValues(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}

/** Same, for a secondary button (e.g. Remove) that runs a different action. */
export function clickKeepingValues(dispatch: (formData: FormData) => void, confirmMessage?: string) {
  return (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const form = event.currentTarget.form;
    if (!form || (confirmMessage && !window.confirm(confirmMessage))) return;
    const formData = new FormData(form);
    startTransition(() => dispatch(formData));
  };
}

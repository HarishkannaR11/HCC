import type { z } from "zod";

/**
 * The one shape every Server Action returns to `useActionState`. Field errors
 * are keyed by form field name so inputs can show their own message.
 */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export const IDLE: ActionState = { status: "idle" };

export function errorState(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { status: "error", message, fieldErrors };
}

export function successState(message: string): ActionState {
  return { status: "success", message };
}

/** First issue per field, plus a summary line. */
export function validationError(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return errorState("Please fix the highlighted fields.", fieldErrors);
}

/** FormData -> plain object of strings, for zod. Checkboxes arrive as "on" or are absent. */
export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value;
  }
  return out;
}

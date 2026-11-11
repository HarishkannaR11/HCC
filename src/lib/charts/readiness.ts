import { serviceYearFor } from "@/lib/hcc/age";
import type { SectionType } from "./constants";

/**
 * Publish gate for a chart. Pure: the editor shows the checklist, the publish
 * action refuses while any blocking check fails, and the seed script runs the
 * same checks over the hand-written charts.
 */

export interface ReadinessInput {
  isSynthetic: boolean;
  paymentYear: number;
  encounterDate: string;
  sections: readonly { sectionType: SectionType; content: string }[];
  answerKey: readonly { icd10Code: string; isRequired: boolean; supportingExcerpt: string | null }[];
  distractors: readonly { icd10Code: string }[];
}

export interface ReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  /** Blocking checks stop a publish; advisory ones are shown but do not. */
  blocking: boolean;
  detail?: string;
}

/** Whitespace- and case-insensitive, so a re-wrapped excerpt still matches the note. */
export function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** True when the excerpt appears verbatim (modulo whitespace and case) in some section. */
export function excerptAppearsInChart(excerpt: string, sections: ReadinessInput["sections"]): boolean {
  const needle = normalizeForMatch(excerpt);
  if (needle === "") return false;
  return sections.some((s) => normalizeForMatch(s.content).includes(needle));
}

export function chartReadiness(input: ReadinessInput): ReadinessCheck[] {
  const required = input.answerKey.filter((item) => item.isRequired);
  const unmatched = input.answerKey.filter(
    (item) => item.supportingExcerpt !== null && !excerptAppearsInChart(item.supportingExcerpt, input.sections),
  );
  const missingExcerpt = required.filter((item) => item.supportingExcerpt === null);
  const serviceYear = serviceYearFor(input.paymentYear);
  const encounterYear = Number(input.encounterDate.slice(0, 4));
  const types = new Set(input.sections.map((s) => s.sectionType));

  return [
    {
      id: "synthetic",
      label: "Marked synthetic",
      ok: input.isSynthetic,
      blocking: true,
    },
    {
      id: "sections",
      label: "Has chart text",
      ok: input.sections.length > 0,
      blocking: true,
    },
    {
      id: "assessment",
      label: "Has an Assessment & plan section",
      ok: types.has("assessment_plan"),
      blocking: true,
      detail: "Risk adjustment codes are supported from the provider's assessment.",
    },
    {
      id: "answer-key",
      label: "Answer key has at least one required code",
      ok: required.length > 0,
      blocking: true,
    },
    {
      id: "excerpts-match",
      label: "Every supporting excerpt appears in the chart text",
      ok: unmatched.length === 0,
      blocking: true,
      detail: unmatched.length ? `Not found: ${unmatched.map((u) => u.icd10Code).join(", ")}` : undefined,
    },
    {
      id: "excerpts-present",
      label: "Every required code has a supporting excerpt",
      ok: missingExcerpt.length === 0,
      blocking: false,
      detail: missingExcerpt.length ? `Missing: ${missingExcerpt.map((m) => m.icd10Code).join(", ")}` : undefined,
    },
    {
      id: "distractors",
      label: "Has at least one distractor",
      ok: input.distractors.length > 0,
      blocking: false,
      detail: "Distractors carry most of the teaching after submission.",
    },
    {
      id: "signature",
      label: "Has a signature / attestation section",
      ok: types.has("signature"),
      blocking: false,
      detail: "Leave it out only when the missing signature is the trap.",
    },
    {
      id: "service-year",
      label: `Encounter date falls in ${serviceYear}`,
      ok: encounterYear === serviceYear,
      blocking: false,
      detail: `PY${input.paymentYear} is scored on ${serviceYear} dates of service.`,
    },
  ];
}

export function isPublishable(checks: readonly ReadinessCheck[]): boolean {
  return checks.every((c) => c.ok || !c.blocking);
}

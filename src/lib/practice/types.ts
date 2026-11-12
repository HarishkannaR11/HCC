/**
 * Wire shapes for the practice loop: what the encoder receives and sends.
 *
 * Nothing here carries the answer key. `EncoderChart` is the note and its
 * synthetic header; `HierarchyRef` and code options are public CMS reference
 * data. The key is only read on the server, at submission.
 */
import { z } from "zod";
import type { SectionType } from "@/lib/charts/constants";
import type { CodeMappingRef } from "@/lib/scoring/reference";

export interface EncoderSection {
  id: string;
  type: SectionType;
  label: string;
  /** Paragraphs of the section, each a stable evidence anchor (`${id}.${index}`). */
  paragraphs: { id: string; text: string }[];
}

export interface EncoderChart {
  id: string;
  title: string;
  specialty: string;
  difficulty: number;
  paymentYear: number;
  encounterDate: string;
  /** `age` is whole years at the encounter: the age the CMS edits are applied with (DECISIONS.md). */
  patient: { name: string; dob: string; sex: "male" | "female"; mrn: string; age: number };
  providerName: string;
  facilityName: string;
  sections: EncoderSection[];
}

/** One HCC a code can map to, with the CMS edits that decide whether it applies. */
export interface CodeOptionHcc extends CodeMappingRef {
  code: string;
  label: string;
}

/** A typeahead result. */
export interface CodeOption {
  code: string;
  description: string;
  hccs: CodeOptionHcc[];
}

/** Shape of search_icd10_codes' `hccs` jsonb, validated at the boundary. */
export const searchHccSchema = z.array(
  z.object({
    hcc_code: z.string().regex(/^HCC\d+$/),
    label: z.string(),
    age_edit: z.string().nullable(),
    sex_edit: z.string().nullable(),
    mce_age_condition: z.string().nullable(),
  }),
);

export const MAX_SUBMITTED_CODES = 50;

const codeEntry = z.object({
  code: z.string().trim().min(1).max(10),
  excerpt: z.string().max(4000).default(""),
  rationale: z.string().max(2000).default(""),
});

/** A draft save: the tray as it stands, on the learner's open attempt. */
export const saveDraftSchema = z.object({
  attemptId: z.uuid(),
  codes: z.array(codeEntry).max(50, "At most 50 codes."),
});

/** What the encoder submits. Validated by the submit Server Action. */
export const submitAttemptSchema = z.object({
  attemptId: z.uuid(),
  /** The browser's IANA time zone: decides which local day the submission counts towards. */
  timezone: z
    .string()
    .max(64)
    .regex(/^[A-Za-z0-9_+\-/]+$/)
    .catch("UTC"),
  codes: z
    .array(codeEntry)
    .min(1, "Assign at least one code before submitting.")
    .max(MAX_SUBMITTED_CODES, `Submit at most ${MAX_SUBMITTED_CODES} codes.`),
});

export type SubmitAttemptInput = z.input<typeof submitAttemptSchema>;

/**
 * Timed-mode limits by chart difficulty, for display before an attempt starts.
 * The database sets the real limit (timed_limit_seconds() in migration 0010);
 * keep these two in step.
 */
export const TIMED_LIMIT_SECONDS: Record<number, number> = { 1: 600, 2: 900, 3: 1200 };

/**
 * A timed attempt counts as within its limit up to this many seconds over:
 * the auto-submit fires at 0:00, and the round trip to record it lands just
 * after.
 */
export const TIMED_GRACE_SECONDS = 10;

export function withinTimeLimit(durationSeconds: number | null, limitSeconds: number | null): boolean {
  return durationSeconds !== null && limitSeconds !== null && durationSeconds <= limitSeconds + TIMED_GRACE_SECONDS;
}

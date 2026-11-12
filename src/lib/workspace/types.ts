/**
 * Client-side state shapes for the encoder.
 *
 * Nothing here carries the answer key: the encoder holds what the learner has
 * assigned, the evidence they linked, and public reference data.
 */
import type { CodeOptionHcc } from "@/lib/practice/types";

/** A code in the learner's tray. */
export interface AssignedCode {
  code: string;
  description: string;
  hccs: CodeOptionHcc[];
  /** Optional free-text rationale; submitted with the code. */
  rationale: string;
}

/** A run of chart text the learner linked to an assigned code as its support. */
export interface EvidenceLink {
  id: string;
  code: string;
  /** `${sectionId}.${paragraphIndex}` */
  paragraphId: string;
  start: number;
  end: number;
  text: string;
}

/** Separator between evidence snippets in attempt_codes.supporting_excerpt. */
export const EXCERPT_SEPARATOR = " … ";

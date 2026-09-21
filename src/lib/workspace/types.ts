/**
 * Shared types for the chart coding workspace.
 *
 * These describe the wire shape the real routes will use in Phase 1b
 * (GET /api/codes, POST /api/raf-preview, POST /api/score) as closely as the
 * mock allows, so swapping `workspace-api.ts`'s implementations later doesn't
 * ripple through the components.
 *
 * Hard rule: nothing here — and nothing the mock returns — carries the answer
 * key. `Chart` has no expected-codes field, and `SubmitAttemptResult` reports
 * only that the submission was received, not whether it was right.
 */

export type Difficulty = "introductory" | "intermediate" | "advanced";
export type PracticeMode = "guided" | "exam";
export type PatientSex = "male" | "female";
export type MeatElement = "M" | "E" | "A" | "T";

/** One selectable run of chart text. Ids are stable across renders. */
export interface ChartBlock {
  id: string;
  text: string;
}

/** A titled group of blocks, rendered as prose paragraphs or a numbered plan. */
export interface ChartSection {
  id: string;
  heading: string;
  kind: "prose" | "ordered";
  blocks: ChartBlock[];
}

export interface ChartBody {
  sections: ChartSection[];
  signature: string;
}

export interface Chart {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** 1-based position in the current practice set, e.g. "Chart 1 of 10". */
  position: { index: number; total: number };

  patientRef: string;
  patientAge: number;
  patientSex: PatientSex;
  dateOfService: string; // ISO date
  visitType: string;

  /** Guided-mode-only coaching text; Exam mode never shows it. */
  hint: string | null;

  body: ChartBody;
}

/** An HCC a code maps to. No RAF weight here — that only ever comes from
 * previewRaf, which can apply age/sex edits and hierarchy suppression. */
export interface CodeHccMapping {
  category: number;
  label: string;
}

export interface CodeSearchResult {
  icd10Code: string;
  description: string;
  hccs: CodeHccMapping[];
}

/** One evidence span a coder has linked from the chart to a claimed code. */
export interface EvidenceLink {
  id: string;
  codeId: string; // the ICD-10 code this evidence supports
  sectionId: string;
  blockId: string;
  start: number; // offset into the block's plain text
  end: number;
  text: string; // snapshot of the linked text, for display without re-slicing
  meat: MeatElement[]; // which MEAT elements this span demonstrates
}

/** Per-mapping detail for one claimed code, as RAF preview would explain it. */
export interface RafMappingPreview {
  category: number;
  label: string;
  rafWeight: number;
  counted: boolean;
  /** Set when a more severe HCC in the same family already captured this. */
  suppressedBy: number | null;
}

export interface RafCodePreview {
  icd10Code: string;
  description: string;
  mapsToHcc: boolean;
  mappings: RafMappingPreview[];
  /** Sum of this code's counted mappings — 0 when every mapping is suppressed. */
  scoredWeight: number;
}

export interface RafPreviewResult {
  codes: RafCodePreview[];
  capturedHccs: number[];
  totalRaf: number;
}

export interface SubmitAttemptPayload {
  chartId: string;
  claimedCodes: string[];
  evidenceLinks: EvidenceLink[];
}

/** Acknowledgement only. Scoring is a server-side concern (Phase 2) and is
 * never computed or revealed on the client. */
export interface SubmitAttemptResult {
  received: true;
  receivedAt: string; // ISO timestamp
  chartId: string;
  codeCount: number;
}

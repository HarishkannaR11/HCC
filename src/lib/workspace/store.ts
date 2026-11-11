/**
 * Encoder state: the open attempt, assigned codes and evidence links.
 *
 * One store per mounted encoder (created in <Encoder> and passed through
 * context), so moving from one chart to the next can never carry codes across.
 * Zustand rather than a reducer because the chart pane, search box and tray
 * each subscribe to different slices and should not re-render together.
 */
import { createStore } from "zustand/vanilla";
import type { CodeOption } from "@/lib/practice/types";
import { EXCERPT_SEPARATOR, type AssignedCode, type EvidenceLink } from "./types";

export interface EncoderState {
  /** Null until the first code is assigned; then the server-side attempt. */
  attemptId: string | null;
  /** Database time the attempt started, in ms. */
  startedAt: number | null;
  /** Chosen before the attempt starts; fixed once it has. */
  mode: AttemptMode;
  /** Set by the database for timed attempts. */
  timeLimitSeconds: number | null;
  assigned: AssignedCode[];
  evidence: EvidenceLink[];

  setAttempt: (attempt: { attemptId: string; startedAt: number; mode: AttemptMode; timeLimitSeconds: number | null }) => void;
  chooseMode: (mode: AttemptMode) => void;
  add: (option: CodeOption) => void;
  remove: (code: string) => void;
  setRationale: (code: string, rationale: string) => void;
  linkEvidence: (link: Omit<EvidenceLink, "id">) => void;
  unlinkEvidence: (id: string) => void;
}

export type AttemptMode = "practice" | "timed";

export interface EncoderInitialState {
  attemptId: string | null;
  startedAt: number | null;
  mode: AttemptMode;
  timeLimitSeconds: number | null;
  assigned: AssignedCode[];
  evidence: EvidenceLink[];
}

let nextId = 0;
export const evidenceId = () => `ev-${(nextId += 1)}-${Date.now().toString(36)}`;

export function createEncoderStore(initial: EncoderInitialState) {
  return createStore<EncoderState>((set) => ({
    ...initial,

    setAttempt: (attempt) => set(attempt),
    chooseMode: (mode) => set((s) => (s.attemptId ? s : { mode })),
    // Claim order matters to the engine only for labelling which code owns a
    // shared HCC; it never changes the total.
    add: (option) =>
      set((s) =>
        s.assigned.some((a) => a.code === option.code)
          ? s
          : { assigned: [...s.assigned, { code: option.code, description: option.description, hccs: option.hccs, rationale: "" }] },
      ),
    remove: (code) =>
      set((s) => ({
        assigned: s.assigned.filter((a) => a.code !== code),
        // Evidence for a code that is no longer assigned means nothing.
        evidence: s.evidence.filter((e) => e.code !== code),
      })),
    setRationale: (code, rationale) =>
      set((s) => ({ assigned: s.assigned.map((a) => (a.code === code ? { ...a, rationale } : a)) })),
    linkEvidence: (link) => set((s) => ({ evidence: [...s.evidence, { ...link, id: evidenceId() }] })),
    unlinkEvidence: (id) => set((s) => ({ evidence: s.evidence.filter((e) => e.id !== id) })),
  }));
}

export type EncoderStore = ReturnType<typeof createEncoderStore>;

/** All evidence for one code, joined for attempt_codes.supporting_excerpt. */
export function excerptFor(evidence: readonly EvidenceLink[], code: string): string {
  return evidence
    .filter((e) => e.code === code)
    .map((e) => e.text.trim())
    .join(EXCERPT_SEPARATOR);
}

/** The tray as the server stores it. */
export function trayPayload(state: Pick<EncoderState, "assigned" | "evidence">) {
  return state.assigned.map((a) => ({ code: a.code, excerpt: excerptFor(state.evidence, a.code), rationale: a.rationale }));
}

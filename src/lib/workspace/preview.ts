/**
 * The encoder's running RAF: the same engine the server scores with, run in the
 * browser over public reference data. A preview of what the learner's own
 * codes are worth — it knows nothing about the answer key.
 */
import { computeCapturedRaf, type RafResult } from "@/lib/hcc/raf";
import { satisfiesAgeCondition, satisfiesSexEdit } from "@/lib/hcc/edits";
import type { Patient } from "@/lib/hcc/types";
import { buildReferenceSlice, type HierarchyRef } from "@/lib/scoring/reference";
import type { CodeOptionHcc } from "@/lib/practice/types";
import type { AssignedCode } from "./types";

export function previewRaf(assigned: readonly AssignedCode[], patient: Patient, hierarchy: HierarchyRef): RafResult {
  const mappings = new Map(assigned.map((a) => [a.code, a.hccs]));
  return computeCapturedRaf(
    assigned.map((a) => a.code),
    patient,
    buildReferenceSlice(hierarchy, mappings),
  );
}

/** The HCCs a search result would capture for this patient, after CMS edits. */
export function applicableHccs(hccs: readonly CodeOptionHcc[], patient: Patient): CodeOptionHcc[] {
  return hccs.filter(
    (h) =>
      satisfiesAgeCondition(h.ageEdit, patient.age) &&
      satisfiesSexEdit(h.sexEdit, patient.sex) &&
      satisfiesAgeCondition(h.mceAgeCondition, patient.age),
  );
}

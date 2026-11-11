/**
 * Builds the engine's ReferenceSlice from plain rows. Pure, and shared by the
 * server (scoring) and the browser (the encoder's running total), so both
 * resolve codes against identical data.
 */
import type { ReferenceSlice } from "@/lib/hcc/types";

/** One HCC category for a payment year. */
export interface HccRef {
  number: number;
  code: string;
  label: string;
  group: string;
  raf: number;
}

/** The year-wide part of the reference: every HCC and every suppression pair. */
export interface HierarchyRef {
  paymentYear: number;
  hccs: HccRef[];
  /** [suppressor, suppressed] HCC numbers, exactly as CMS publishes them. */
  suppressions: [number, number][];
}

/** One code's HCC mappings with their CMS edits. */
export interface CodeMappingRef {
  hcc: number;
  ageEdit: string | null;
  sexEdit: string | null;
  mceAgeCondition: string | null;
}

export function buildReferenceSlice(
  hierarchy: HierarchyRef,
  mappingsByCode: ReadonlyMap<string, readonly CodeMappingRef[]>,
): ReferenceSlice {
  return {
    mappings: [...mappingsByCode].flatMap(([code, mappings]) =>
      mappings.map((m) => ({
        icd10Code: code,
        hccCategory: m.hcc,
        ageEdit: m.ageEdit,
        sexEdit: m.sexEdit,
        mceAgeCondition: m.mceAgeCondition,
      })),
    ),
    weights: new Map(
      hierarchy.hccs.map((h) => [h.number, { category: h.number, label: h.label, family: h.group, rafWeight: h.raf }]),
    ),
    suppressions: hierarchy.suppressions.map(([category, suppressed]) => ({ category, suppressed })),
  };
}

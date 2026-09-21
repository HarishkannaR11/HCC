/**
 * RAF capture for a set of claimed codes. Pure: everything it needs is passed
 * in, nothing is fetched, no rounding surprises.
 *
 * The walk is the same one CMS's own software does:
 *
 *   claimed codes -> crosswalk rows -> drop rows whose age/sex edit does not fit
 *   this patient -> one HCC counted once -> apply the V28 hierarchy so a severe
 *   category suppresses a milder one in the same family -> sum the coefficients.
 *
 * Every step is reported per code, because the point of the tool is to show the
 * coder *why* a code earned nothing, not just that it did.
 */
import { satisfiesAgeCondition, satisfiesSexEdit } from "./edits";
import type { Patient, ReferenceSlice } from "./types";

/** Why a single (code, HCC) mapping did or did not score. */
export interface MappingOutcome {
  hccCategory: number;
  label: string;
  family: string;
  /** The catalogue coefficient, whether or not it scored. */
  rafWeight: number;
  /** What this mapping actually contributed. */
  scoredWeight: number;
  counted: boolean;
  /** A more severe HCC in the same family, captured on this chart. */
  suppressedBy: number | null;
  /** An earlier claimed code that already captured this HCC. */
  duplicateOf: string | null;
  /** The edit that excluded this mapping for this patient, e.g. 'age >= 50'. */
  excludedByEdit: string | null;
}

export interface CodeOutcome {
  icd10Code: string;
  /** One entry per crosswalk row for the code. Empty when the code carries no HCC. */
  mappings: MappingOutcome[];
  /** Sum of this code's counted mappings. */
  scoredWeight: number;
  /** True when the code maps to at least one HCC, before edits are applied. */
  mapsToHcc: boolean;
}

export interface RafResult {
  codes: CodeOutcome[];
  /** Categories that actually scored, ascending. */
  capturedHccs: number[];
  /** Sum of the counted coefficients, rounded to three decimals. */
  totalRaf: number;
}

/**
 * Coefficients are numeric(6,3): exact to a thousandth. Summing them as floats
 * drifts (0.166 + 0.127 + 0.319 is not 0.612 in binary), so the sum is done in
 * integer thousandths and divided once at the end.
 */
const SCALE = 1000;
const toThousandths = (weight: number): number => Math.round(weight * SCALE);

export function computeCapturedRaf(
  claimedCodes: readonly string[],
  patient: Patient,
  reference: ReferenceSlice,
): RafResult {
  const mappingsByCode = new Map<string, typeof reference.mappings>();
  for (const mapping of reference.mappings) {
    const list = mappingsByCode.get(mapping.icd10Code) ?? [];
    list.push(mapping);
    mappingsByCode.set(mapping.icd10Code, list);
  }

  // Claim order decides which code owns a shared HCC, so the coder sees the
  // duplicate flag on the code they added second.
  const uniqueCodes = [...new Set(claimedCodes)];

  /** First code to claim each HCC, after edits. */
  const ownerOf = new Map<number, string>();
  for (const code of uniqueCodes) {
    for (const mapping of mappingsByCode.get(code) ?? []) {
      if (!appliesToPatient(mapping, patient)) continue;
      if (!ownerOf.has(mapping.hccCategory)) ownerOf.set(mapping.hccCategory, code);
    }
  }

  // Suppression is judged against every HCC present on the chart, not only the
  // ones still counting. The hierarchy is stored fully expanded, so this is
  // already transitive: HCC326 lists 327, 328 and 329 directly.
  const present = new Set(ownerOf.keys());
  const suppressorOf = new Map<number, number>();
  for (const pair of reference.suppressions) {
    if (!present.has(pair.category) || !present.has(pair.suppressed)) continue;
    const current = suppressorOf.get(pair.suppressed);
    // V28 numbers the more severe category lower within a family, so the
    // smallest suppressor is the one worth naming.
    if (current === undefined || pair.category < current) {
      suppressorOf.set(pair.suppressed, pair.category);
    }
  }

  let totalThousandths = 0;
  const capturedHccs: number[] = [];

  const codes: CodeOutcome[] = uniqueCodes.map((code) => {
    const rows = mappingsByCode.get(code) ?? [];

    const mappings: MappingOutcome[] = rows.map((mapping) => {
      const weight = reference.weights.get(mapping.hccCategory);
      if (!weight) {
        throw new Error(
          `HCC${mapping.hccCategory} is in the crosswalk but has no coefficient — reference data is inconsistent`,
        );
      }

      const excludedByEdit = failingEdit(mapping, patient);
      const owner = ownerOf.get(mapping.hccCategory);
      const duplicateOf = excludedByEdit === null && owner !== undefined && owner !== code ? owner : null;
      const suppressedBy =
        excludedByEdit === null && duplicateOf === null
          ? suppressorOf.get(mapping.hccCategory) ?? null
          : null;

      const counted = excludedByEdit === null && duplicateOf === null && suppressedBy === null;
      if (counted) {
        totalThousandths += toThousandths(weight.rafWeight);
        capturedHccs.push(mapping.hccCategory);
      }

      return {
        hccCategory: mapping.hccCategory,
        label: weight.label,
        family: weight.family,
        rafWeight: weight.rafWeight,
        scoredWeight: counted ? weight.rafWeight : 0,
        counted,
        suppressedBy,
        duplicateOf,
        excludedByEdit,
      };
    });

    return {
      icd10Code: code,
      mappings,
      scoredWeight: mappings.reduce((sum, m) => sum + toThousandths(m.scoredWeight), 0) / SCALE,
      mapsToHcc: rows.length > 0,
    };
  });

  return {
    codes,
    capturedHccs: capturedHccs.sort((a, b) => a - b),
    totalRaf: totalThousandths / SCALE,
  };
}

/** The first edit on this mapping that the patient fails, or null if all fit. */
function failingEdit(
  mapping: ReferenceSlice["mappings"][number],
  patient: Patient,
): string | null {
  if (!satisfiesAgeCondition(mapping.ageEdit, patient.age)) return mapping.ageEdit;
  if (!satisfiesSexEdit(mapping.sexEdit, patient.sex)) {
    return Number(mapping.sexEdit) === 1 ? "male only" : "female only";
  }
  if (!satisfiesAgeCondition(mapping.mceAgeCondition, patient.age)) return mapping.mceAgeCondition;
  return null;
}

const appliesToPatient = (
  mapping: ReferenceSlice["mappings"][number],
  patient: Patient,
): boolean => failingEdit(mapping, patient) === null;

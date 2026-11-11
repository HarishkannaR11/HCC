import { satisfiesAgeCondition, satisfiesSexEdit } from "@/lib/hcc/edits";
import type { Patient } from "@/lib/hcc/types";

/** One icd_hcc_map row joined to its category, as the editor reads it. */
export interface CodeMapping {
  hccCategoryId: number;
  hccNumber: number;
  hccCode: string;
  label: string;
  raf: number;
  ageEdit: string | null;
  sexEdit: string | null;
  mceAgeCondition: string | null;
}

/** The mappings whose CMS age/sex edits this patient satisfies. */
export function applicableMappings(mappings: readonly CodeMapping[], patient: Patient): CodeMapping[] {
  return mappings
    .filter(
      (m) =>
        satisfiesAgeCondition(m.ageEdit, patient.age) &&
        satisfiesSexEdit(m.sexEdit, patient.sex) &&
        satisfiesAgeCondition(m.mceAgeCondition, patient.age),
    )
    .sort((a, b) => a.hccNumber - b.hccNumber);
}

/**
 * The single HCC stored on an answer-key row. Most codes have one applicable
 * mapping; for the few that capture two, the lower-numbered (more severe in V28
 * numbering) is stored. This is a label for the editor only — scoring resolves
 * every HCC from the map again.
 */
export function primaryHccCategoryId(mappings: readonly CodeMapping[], patient: Patient): number | null {
  return applicableMappings(mappings, patient)[0]?.hccCategoryId ?? null;
}

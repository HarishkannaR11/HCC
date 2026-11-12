/**
 * Which HCC(s) an ICD-10-CM code lands in for one synthetic patient.
 *
 * Pure. Used where a single HCC has to be recorded against a code -- the
 * answer-key editor and the seed script store answer_key_items.hcc_category_id
 * -- so the value is resolved from icd_hcc_map, never typed by an author.
 */
import { satisfiesAgeCondition, satisfiesSexEdit } from "./edits";
import type { Patient } from "./types";

export interface EditedMapping {
  /** Numeric part of the HCC, used for ordering ('HCC37' -> 37). */
  hccCode: string;
  ageEdit: string | null;
  sexEdit: string | null;
  mceAgeCondition: string | null;
}

/** Mappings whose CMS age, sex and MCE edits all hold for this patient. */
export function applicableMappings<T extends EditedMapping>(mappings: readonly T[], patient: Patient): T[] {
  return mappings.filter(
    (m) =>
      satisfiesAgeCondition(m.ageEdit, patient.age) &&
      satisfiesSexEdit(m.sexEdit, patient.sex) &&
      satisfiesAgeCondition(m.mceAgeCondition, patient.age),
  );
}

const hccNumber = (hccCode: string): number => Number(hccCode.replace(/^HCC/, ""));

/**
 * The HCC to record for a code: the lowest-numbered applicable mapping, or
 * null when the code carries no HCC for this patient. A handful of codes land
 * in two HCCs at once (B37.7: sepsis and opportunistic infection); scoring
 * re-resolves every code through the full map, so recording one is display
 * only and loses nothing.
 */
export function primaryMapping<T extends EditedMapping>(mappings: readonly T[], patient: Patient): T | null {
  const applicable = applicableMappings(mappings, patient);
  if (applicable.length === 0) return null;
  return [...applicable].sort((a, b) => hccNumber(a.hccCode) - hccNumber(b.hccCode))[0];
}

/**
 * Whole years between an ISO date of birth and an ISO date (the encounter).
 * Date-only arithmetic, so no time zone can shift a birthday.
 */
export function ageOn(dateOfBirth: string, onDate: string): number {
  const parse = (iso: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) throw new Error(`Expected an ISO date (YYYY-MM-DD), got ${JSON.stringify(iso)}`);
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  };
  const birth = parse(dateOfBirth);
  const on = parse(onDate);
  let age = on.y - birth.y;
  if (on.m < birth.m || (on.m === birth.m && on.d < birth.d)) age -= 1;
  if (age < 0) throw new Error(`Date of birth ${dateOfBirth} is after ${onDate}`);
  return age;
}

/**
 * Crosswalk age and sex edits.
 *
 * CMS publishes these as short English predicates rather than structured
 * columns, in a small closed set:
 *
 *   age_edit           'age < 50'  'age >= 50'  'age < 2'  'age >= 18'
 *   mce_age_condition  'age >= 15' '0 <= age <= 17' '9 <= age <= 64' 'age = 0'
 *   sex_edit           '1.0' (male)  '2.0' (female)
 *
 * An edit that does not apply to this patient means the mapping does not apply:
 * C50.011 is HCC22 under 50 and HCC23 at 50 or over, never both.
 *
 * Unparseable input throws. A silently ignored edit would produce a RAF that
 * looks right and is wrong, which is the one failure mode this tool cannot
 * afford; a loud error on a future CMS release is the safer trade.
 */
import type { PatientSex } from "./types";

const BAND = /^(\d+)\s*<=\s*age\s*<=\s*(\d+)$/;
const SIMPLE = /^age\s*(<=|>=|<|>|=)\s*(\d+)$/;

/** True when `age` satisfies the condition. A null condition is unconditional. */
export function satisfiesAgeCondition(condition: string | null | undefined, age: number): boolean {
  if (condition == null || condition.trim() === "") return true;
  const text = condition.trim().toLowerCase();

  const band = BAND.exec(text);
  if (band) return age >= Number(band[1]) && age <= Number(band[2]);

  const simple = SIMPLE.exec(text);
  if (simple) {
    const bound = Number(simple[2]);
    switch (simple[1]) {
      case "<":  return age < bound;
      case "<=": return age <= bound;
      case ">":  return age > bound;
      case ">=": return age >= bound;
      case "=":  return age === bound;
    }
  }

  throw new Error(`Unrecognised age condition in crosswalk: ${JSON.stringify(condition)}`);
}

/** CMS sex codes: 1 is male, 2 is female. Published as '1.0' / '2.0'. */
export function satisfiesSexEdit(edit: string | null | undefined, sex: PatientSex): boolean {
  if (edit == null || edit.trim() === "") return true;

  const code = Number(edit);
  if (code === 1) return sex === "male";
  if (code === 2) return sex === "female";

  throw new Error(`Unrecognised sex edit in crosswalk: ${JSON.stringify(edit)}`);
}

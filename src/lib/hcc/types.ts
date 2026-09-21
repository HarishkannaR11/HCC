/** Shared shapes for the risk-adjustment engine. */

/** Sex is stored as a word and converted to the CMS code (1 male, 2 female). */
export type PatientSex = "male" | "female";

/** The demographic facts the crosswalk's edits are evaluated against. */
export interface Patient {
  age: number;
  sex: PatientSex;
}

/** One row of `crosswalk`, plus the code it belongs to. */
export interface CrosswalkMapping {
  icd10Code: string;
  hccCategory: number;
  /** V28 edit choosing between HCCs, e.g. 'age < 50'. */
  ageEdit: string | null;
  /** CMS sex code as published: '1.0' male, '2.0' female. */
  sexEdit: string | null;
  /** Medicare Code Editor age band, e.g. '0 <= age <= 17'. */
  mceAgeCondition: string | null;
}

/** One row of `hcc_weights`, narrowed to what scoring needs. */
export interface HccWeight {
  category: number;
  label: string;
  family: string;
  /** Community non-dual aged coefficient. */
  rafWeight: number;
}

/** One row of `hcc_hierarchy`: `category` captured means `suppressed` does not score. */
export interface SuppressionPair {
  category: number;
  suppressed: number;
}

/** Everything the engine needs, already read out of Postgres. */
export interface ReferenceSlice {
  mappings: CrosswalkMapping[];
  weights: Map<number, HccWeight>;
  suppressions: SuppressionPair[];
}

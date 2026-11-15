/**
 * Shape of a hand-written synthetic seed chart.
 *
 * EVERY PERSON, DATE, MRN, PROVIDER AND FACILITY IN A SEED CHART IS INVENTED.
 * No real patient record is used or consulted.
 */
import type { PatientSex, SectionType, TrapType } from "../../src/lib/charts/constants";

export interface SeedKeyItem {
  code: string;
  required: boolean;
  /** Verbatim substring of the chart text; the seed script asserts it. */
  excerpt: string;
  rationale: string;
  trap: TrapType;
}

export interface SeedDistractor {
  code: string;
  whyWrong: string;
  trap: TrapType;
}

export interface SeedChart {
  id: string;
  title: string;
  specialty: string;
  difficulty: 1 | 2 | 3;
  paymentYear: number;
  encounterDate: string;
  patient: { name: string; dob: string; sex: PatientSex; mrn: string };
  provider: string;
  facility: string;
  sections: Partial<Record<SectionType, string>>;
  key: SeedKeyItem[];
  distractors: SeedDistractor[];
  /**
   * What the chart is designed to teach, for a reviewer and for the scoring
   * test: the key's HCCs after hierarchy trimming, the HCCs trimmed away, and
   * the disease RAF (sum of community non-dual aged coefficients).
   */
  expected: { hccs: number[]; trimmed: number[]; raf: number };
}

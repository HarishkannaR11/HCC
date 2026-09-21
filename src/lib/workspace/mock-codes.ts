/**
 * MOCK — a small hand-picked ICD-10-CM catalog for the frontend slice.
 *
 * The real catalog is ~74k billable codes served by `search_codes()`
 * (supabase/migrations/0003_search_codes.sql); this is enough to exercise
 * search, adding, and — importantly — the V28 hierarchy suppression demo
 * (E11.22 already claimed, then E11.9 added next to it).
 *
 * Weights and the two suppression pairs below are hardcoded ONLY for this
 * mock. In production every number comes from `hcc_weights` /
 * `hcc_hierarchy`, never from a constant in application code.
 */
import type { CodeHccMapping } from "./types";

export interface MockCode {
  icd10Code: string;
  description: string;
  hccs: CodeHccMapping[];
  /** MOCK — replaced by hcc_weights.raf_weight per HCC. */
  weights: Record<number, number>;
}

export const MOCK_CODES: MockCode[] = [
  {
    icd10Code: "E11.22",
    description: "Type 2 diabetes mellitus with diabetic chronic kidney disease",
    hccs: [{ category: 37, label: "Diabetes with Chronic Complications" }],
    weights: { 37: 0.166 },
  },
  {
    icd10Code: "E11.9",
    description: "Type 2 diabetes mellitus without complications",
    hccs: [{ category: 38, label: "Diabetes with No, Glycemic, or Unspecified Complications" }],
    weights: { 38: 0.166 },
  },
  {
    icd10Code: "E11.65",
    description: "Type 2 diabetes mellitus with hyperglycemia",
    hccs: [{ category: 37, label: "Diabetes with Chronic Complications" }],
    weights: { 37: 0.166 },
  },
  {
    icd10Code: "E11.40",
    description: "Type 2 diabetes mellitus with diabetic neuropathy, unspecified",
    hccs: [{ category: 37, label: "Diabetes with Chronic Complications" }],
    weights: { 37: 0.166 },
  },
  {
    icd10Code: "N18.31",
    description: "Chronic kidney disease, stage 3a",
    hccs: [{ category: 329, label: "Chronic Kidney Disease, Moderate (Stage 3, Except 3B)" }],
    weights: { 329: 0.127 },
  },
  {
    icd10Code: "N18.30",
    description: "Chronic kidney disease, stage 3 unspecified",
    hccs: [{ category: 329, label: "Chronic Kidney Disease, Moderate (Stage 3, Except 3B)" }],
    weights: { 329: 0.127 },
  },
  {
    icd10Code: "N18.4",
    // MOCK label/category only — demonstrates the 328 -> 329 suppression pair
    // the UI spec asked for. The real V28 severe-CKD category is HCC327; do
    // not treat this row's HCC number as authoritative.
    description: "Chronic kidney disease, stage 4",
    hccs: [{ category: 328, label: "Chronic Kidney Disease, Severe (mock)" }],
    weights: { 328: 0.289 },
  },
  {
    icd10Code: "J44.9",
    description: "Chronic obstructive pulmonary disease, unspecified",
    hccs: [{ category: 280, label: "Chronic Obstructive Pulmonary Disease, Interstitial Lung Disorders, and Other Chronic Lung Disorders" }],
    weights: { 280: 0.319 },
  },
  {
    icd10Code: "E78.5",
    description: "Hyperlipidemia, unspecified",
    hccs: [],
    weights: {},
  },
  {
    icd10Code: "I10",
    description: "Essential (primary) hypertension",
    hccs: [],
    weights: {},
  },
];

/** MOCK — replaces hcc_hierarchy for this small catalog only. */
export const MOCK_SUPPRESSION_PAIRS: Array<{ category: number; suppressed: number }> = [
  { category: 37, suppressed: 38 },
  { category: 328, suppressed: 329 },
];

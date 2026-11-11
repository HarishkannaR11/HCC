import type { ReferenceSlice } from "@/lib/hcc/types";

/**
 * PY2026 V28 values for the codes the seed charts and these tests use: the
 * ICD-10 -> HCC mapping, the community non-dual aged coefficient and the
 * hierarchy pairs among them, as listed in the CMS model software. A reviewer
 * can check each line against the CMS files.
 */
const MAPPINGS: [string, number, string | null][] = [
  ["E11.22", 37, null], ["E11.42", 37, null], ["E11.9", 38, null], ["E11.65", 38, null], ["Z79.4", 38, null],
  ["N18.30", 329, null], ["N18.31", 329, null], ["N18.32", 328, null], ["N18.4", 327, null], ["N18.5", 326, null],
  ["J44.9", 280, null], ["J44.1", 280, null],
  ["I11.0", 226, null], ["I50.22", 226, null], ["I50.23", 224, null], ["I42.0", 227, null],
  ["I48.19", 238, null], ["I48.91", 238, null],
  ["C50.912", 23, null], ["M06.9", 93, null], ["Z89.511", 409, null], ["F33.1", 155, null],
  ["C50.011", 22, "age < 50"], ["C50.011", 23, "age >= 50"],
];

const WEIGHTS: [number, string, number][] = [
  [22, "Breast, Prostate, and Other Cancers and Tumors", 0.363],
  [23, "Prostate, Breast, and Other Cancers and Tumors", 0.186],
  [37, "Diabetes with Chronic Complications", 0.166],
  [38, "Diabetes with Glycemic, Unspecified, or No Complications", 0.166],
  [93, "Rheumatoid Arthritis and Other Specified Inflammatory Rheumatic Disorders", 0.617],
  [155, "Major Depression, Moderate or Severe, without Psychosis", 0.299],
  [224, "Acute on Chronic Heart Failure", 0.36],
  [226, "Heart Failure, Except End-Stage and Acute", 0.36],
  [227, "Cardiomyopathy/Myocarditis", 0.189],
  [238, "Specified Heart Arrhythmias", 0.299],
  [280, "Chronic Obstructive Pulmonary Disease, Interstitial Lung Disorders, and Other Chronic Lung Disorders", 0.319],
  [326, "Chronic Kidney Disease, Stage 5", 0.815],
  [327, "Chronic Kidney Disease, Severe (Stage 4)", 0.514],
  [328, "Chronic Kidney Disease, Moderate (Stage 3B)", 0.127],
  [329, "Chronic Kidney Disease, Moderate (Stage 3, Except 3B)", 0.127],
  [409, "Amputation Status, Lower Limb/Amputation Complications", 0.598],
];

const SUPPRESSIONS: [number, number][] = [
  [22, 23], [37, 38], [224, 226], [224, 227], [226, 227],
  [326, 327], [326, 328], [326, 329], [327, 328], [327, 329], [328, 329],
];

export function v28Fixture(): ReferenceSlice {
  return {
    mappings: MAPPINGS.map(([icd10Code, hccCategory, ageEdit]) => ({
      icd10Code,
      hccCategory,
      ageEdit,
      sexEdit: null,
      mceAgeCondition: null,
    })),
    weights: new Map(WEIGHTS.map(([category, label, rafWeight]) => [category, { category, label, family: "", rafWeight }])),
    suppressions: SUPPRESSIONS.map(([category, suppressed]) => ({ category, suppressed })),
  };
}

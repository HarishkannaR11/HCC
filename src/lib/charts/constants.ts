/**
 * Chart vocabulary shared by the admin editor, the seed script and (from
 * Phase 2) the encoder. Enum values mirror the Postgres enums; the generated
 * Database type keeps them honest.
 */
import type { Database } from "@/lib/supabase/database.types";

export type SectionType = Database["public"]["Enums"]["section_type"];
export type TrapType = Database["public"]["Enums"]["trap_type"];
export type ChartStatus = Database["public"]["Enums"]["chart_status"];
export type PatientSex = Database["public"]["Enums"]["patient_sex"];

/** Canonical order of a progress note. sort_order is the index here. */
export const SECTION_ORDER = [
  "hpi",
  "ros",
  "physical_exam",
  "medications",
  "labs",
  "assessment_plan",
  "signature",
] as const satisfies readonly SectionType[];

export const SECTION_LABELS: Record<SectionType, string> = {
  hpi: "History of present illness",
  ros: "Review of systems",
  physical_exam: "Physical exam",
  medications: "Medications",
  labs: "Labs",
  assessment_plan: "Assessment & plan",
  signature: "Signature",
};

export const TRAP_TYPES = [
  "none",
  "status_vs_history",
  "unsupported_linkage",
  "missing_acuity",
  "no_treatment_documented",
  "unspecified_when_specific_exists",
  "signature_or_date_missing",
] as const satisfies readonly TrapType[];

export const TRAP_LABELS: Record<TrapType, string> = {
  none: "None",
  status_vs_history: "Status vs. history",
  unsupported_linkage: "Unsupported linkage",
  missing_acuity: "Missing acuity",
  no_treatment_documented: "No treatment documented",
  unspecified_when_specific_exists: "Unspecified when specific exists",
  signature_or_date_missing: "Signature or date missing",
};

export const SPECIALTIES = [
  "Family Medicine",
  "Internal Medicine",
  "Geriatrics",
  "Cardiology",
  "Endocrinology",
  "Nephrology",
  "Pulmonology",
  "Oncology",
  "Neurology",
  "Psychiatry",
] as const;

export const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = {
  1: "1 · Foundational",
  2: "2 · Intermediate",
  3: "3 · Advanced",
};

/**
 * Risk adjustment for payment year N uses dates of service in calendar year
 * N-1 (PY2026 is built from 2025 encounters).
 */
export const serviceYearFor = (paymentYear: number): number => paymentYear - 1;

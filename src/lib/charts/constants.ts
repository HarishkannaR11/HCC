import type { Database } from "@/lib/supabase/database.types";

export type SectionType = Database["public"]["Enums"]["section_type"];
export type TrapType = Database["public"]["Enums"]["trap_type"];
export type ChartStatus = Database["public"]["Enums"]["chart_status"];
export type PatientSex = Database["public"]["Enums"]["patient_sex"];

/** In the order a progress note is usually read. */
export const SECTION_TYPES: readonly { value: SectionType; label: string }[] = [
  { value: "chief_complaint", label: "Chief complaint" },
  { value: "hpi", label: "History of present illness" },
  { value: "past_medical_history", label: "Past medical history" },
  { value: "ros", label: "Review of systems" },
  { value: "physical_exam", label: "Physical exam" },
  { value: "medications", label: "Medications" },
  { value: "labs", label: "Labs & results" },
  { value: "assessment_plan", label: "Assessment & plan" },
  { value: "addendum", label: "Addendum" },
  { value: "signature", label: "Signature / attestation" },
];

export const TRAP_TYPES: readonly { value: TrapType; label: string; description: string }[] = [
  { value: "none", label: "None", description: "A straightforward code with no planted trap." },
  {
    value: "status_vs_history",
    label: "Status vs. history",
    description: "Current condition vs. resolved history (or a status code that must still be reported).",
  },
  {
    value: "unsupported_linkage",
    label: "Unsupported linkage",
    description: "A causal link the provider did not document, or explicitly ruled out.",
  },
  {
    value: "missing_acuity",
    label: "Missing acuity",
    description: "Acute / acute-on-chronic coded without documentation of acuity.",
  },
  {
    value: "no_treatment_documented",
    label: "No MEAT documented",
    description: "Listed but not monitored, evaluated, assessed or treated in this encounter.",
  },
  {
    value: "unspecified_when_specific_exists",
    label: "Unspecified when specific exists",
    description: "The documentation supports a more specific or combination code.",
  },
  {
    value: "signature_or_date_missing",
    label: "Signature or date missing",
    description: "Documentation that is unsigned or undated cannot support a code.",
  },
];

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Foundational",
  2: "Intermediate",
  3: "Advanced",
};

export const SPECIALTY_SUGGESTIONS = [
  "Family Medicine",
  "Internal Medicine",
  "Cardiology",
  "Nephrology",
  "Endocrinology",
  "Pulmonology",
  "Geriatrics",
  "Oncology",
  "Psychiatry",
] as const;

export function sectionLabel(type: SectionType): string {
  return SECTION_TYPES.find((s) => s.value === type)?.label ?? type;
}

export function trapLabel(type: TrapType): string {
  return TRAP_TYPES.find((t) => t.value === type)?.label ?? type;
}

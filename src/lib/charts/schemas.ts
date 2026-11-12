/**
 * Input boundary for the admin chart editor. Every server action parses its
 * FormData through one of these before touching the database.
 */
import { z } from "zod";
import { formatIcd10, isPlausibleIcd10, normalizeIcd10 } from "@/lib/icd10";
import { SECTION_ORDER, SPECIALTIES, TRAP_TYPES, serviceYearFor } from "./constants";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date.");
const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `At most ${max} characters.`)
    .transform((v) => (v === "" ? null : v))
    .nullable();
/** An HTML checkbox posts "on" when ticked and nothing otherwise. */
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const icd10CodeInput = z
  .string()
  .trim()
  .min(3, "Enter an ICD-10-CM code.")
  .max(10)
  // Second character is a digit, except FY2026's QA0 block. Existence in the
  // chart's payment year is checked by the database trigger.
  .refine(
    (v) => isPlausibleIcd10(v) && /^[A-Z][0-9A][0-9A-Z]/.test(normalizeIcd10(v)),
    "That does not look like an ICD-10-CM code.",
  )
  .transform(formatIcd10);

export const SYNTHETIC_MRN = /^SYN-[A-Z0-9-]{3,20}$/;

export const chartMetaSchema = z
  .object({
    title: trimmed(3, 200, "Title"),
    specialty: z.enum(SPECIALTIES, "Choose a specialty."),
    difficulty: z.coerce.number().int().min(1).max(3),
    payment_year: z.coerce.number().int().min(2020).max(2100),
    encounter_date: isoDate,
    patient_name: trimmed(2, 120, "Patient name"),
    patient_dob: isoDate,
    patient_sex: z.enum(["male", "female"], "Choose the patient's sex."),
    patient_mrn: z
      .string()
      .trim()
      .toUpperCase()
      .regex(SYNTHETIC_MRN, "MRNs are synthetic and must look like SYN-123456."),
    provider_name: trimmed(2, 120, "Provider"),
    facility_name: trimmed(2, 160, "Facility"),
    confirm_synthetic: checkbox.refine((v) => v, "Confirm the chart is entirely synthetic."),
  })
  .superRefine((value, ctx) => {
    if (value.patient_dob >= value.encounter_date) {
      ctx.addIssue({ code: "custom", path: ["patient_dob"], message: "Date of birth must be before the encounter." });
    }
    const serviceYear = serviceYearFor(value.payment_year);
    if (Number(value.encounter_date.slice(0, 4)) !== serviceYear) {
      ctx.addIssue({
        code: "custom",
        path: ["encounter_date"],
        message: `PY${value.payment_year} uses ${serviceYear} dates of service.`,
      });
    }
  });

export type ChartMetaInput = z.infer<typeof chartMetaSchema>;

export const sectionsSchema = z.object(
  Object.fromEntries(SECTION_ORDER.map((type) => [type, optionalText(20000)])) as Record<
    (typeof SECTION_ORDER)[number],
    ReturnType<typeof optionalText>
  >,
);

export const keyItemSchema = z.object({
  icd10_code: icd10CodeInput,
  is_required: checkbox,
  supporting_excerpt: optionalText(2000),
  rationale: optionalText(4000),
  trap_type: z.enum(TRAP_TYPES),
});

export const distractorSchema = z.object({
  icd10_code: icd10CodeInput,
  why_wrong: trimmed(1, 4000, "Explanation"),
  trap_type: z.enum(TRAP_TYPES),
});

export const uuid = z.uuid();

/** FormData -> plain object, keeping only string fields. */
export function formFields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") out[key] = value;
  return out;
}

/** First message per field, for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Excerpts that do not appear verbatim in the chart text. */
export function excerptsNotInChart(excerpts: Array<string | null>, sections: string[]): string[] {
  const text = sections.join("\n");
  return excerpts.filter((e): e is string => Boolean(e) && !text.includes(e as string));
}

/** The `charts` columns from a parsed form (the confirmation box is not a column). */
export function chartRow(input: ChartMetaInput) {
  return {
    title: input.title,
    specialty: input.specialty,
    difficulty: input.difficulty,
    payment_year: input.payment_year,
    encounter_date: input.encounter_date,
    patient_name: input.patient_name,
    patient_dob: input.patient_dob,
    patient_sex: input.patient_sex,
    patient_mrn: input.patient_mrn,
    provider_name: input.provider_name,
    facility_name: input.facility_name,
  };
}

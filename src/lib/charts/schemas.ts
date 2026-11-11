import { z } from "zod";
import { formatIcd10, isPlausibleIcd10 } from "@/lib/icd10";
import { SECTION_TYPES, TRAP_TYPES } from "./constants";

/**
 * Input boundaries for every chart-admin Server Action. FormData arrives as
 * strings; these schemas trim, coerce and bound it before anything reaches
 * Postgres (which re-checks the same limits).
 */

const id = z.uuid("Invalid id.");
const isoDate = z.iso.date("Use a date (YYYY-MM-DD).");
const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required.` : `${label} needs at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const sectionType = z.enum(SECTION_TYPES.map((s) => s.value) as [string, ...string[]], "Pick a section type.");
const trapType = z.enum(TRAP_TYPES.map((t) => t.value) as [string, ...string[]], "Pick a trap type.");

/** Accepts "e11.22", "E1122", " E11.22 " -> "E11.22". */
export const icd10CodeInput = z
  .string()
  .trim()
  .min(1, "Enter an ICD-10-CM code.")
  .refine(isPlausibleIcd10, "That does not look like an ICD-10-CM code.")
  .transform(formatIcd10);

/** HTML checkboxes post "on" when ticked and nothing when not. */
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const chartIdInput = z.object({ chartId: id });

export const chartDetailsSchema = z
  .object({
    chartId: id,
    title: text("Title", 3, 200),
    specialty: text("Specialty", 2, 80),
    difficulty: z.coerce.number().int().min(1, "Difficulty is 1–3.").max(3, "Difficulty is 1–3."),
    paymentYear: z.coerce.number().int().min(2020).max(2100),
    encounterDate: isoDate,
    patientName: text("Patient name", 2, 120),
    patientDob: isoDate,
    patientSex: z.enum(["male", "female"], "Pick a sex."),
    patientMrn: text("MRN", 2, 40),
    providerName: text("Provider", 2, 120),
    facilityName: text("Facility", 2, 120),
    isSynthetic: checkbox,
  })
  .refine((v) => v.isSynthetic, {
    path: ["isSynthetic"],
    message: "Confirm the chart is entirely synthetic. Real patient data is never allowed.",
  })
  .refine((v) => v.patientDob < v.encounterDate, {
    path: ["patientDob"],
    message: "Date of birth must be before the encounter date.",
  });

export const sectionCreateSchema = z.object({
  chartId: id,
  sectionType,
  content: text("Section text", 1, 20000),
});

export const sectionUpdateSchema = sectionCreateSchema.extend({ sectionId: id });

export const sectionMoveSchema = z.object({
  chartId: id,
  sectionId: id,
  direction: z.enum(["up", "down"]),
});

export const answerKeyItemCreateSchema = z.object({
  chartId: id,
  icd10Code: icd10CodeInput,
  isRequired: checkbox,
  supportingExcerpt: optionalText(2000),
  rationale: optionalText(4000),
  trapType,
});

export const answerKeyItemUpdateSchema = answerKeyItemCreateSchema.omit({ icd10Code: true }).extend({ itemId: id });

export const distractorCreateSchema = z.object({
  chartId: id,
  icd10Code: icd10CodeInput,
  whyWrong: text("Explanation", 1, 4000),
  trapType,
});

export const distractorUpdateSchema = distractorCreateSchema.omit({ icd10Code: true }).extend({ distractorId: id });

export const rowDeleteSchema = z.object({ chartId: id, rowId: id });

export const chartStatusSchema = z.object({
  chartId: id,
  status: z.enum(["draft", "published"]),
});

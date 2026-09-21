/**
 * ICD-10-CM code normalisation.
 *
 * CMS ships codes without the decimal ("E119"); humans type them with one
 * ("E11.9"). We store the dotted form as the canonical key and normalise every
 * lookup through `normalizeIcd10` so either spelling matches.
 */

/** Strip punctuation/whitespace and upper-case. "e11.9 " -> "E119" */
export function normalizeIcd10(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** Canonical display form: decimal after the 3-character category. "E119" -> "E11.9" */
export function formatIcd10(raw: string): string {
  const flat = normalizeIcd10(raw);
  return flat.length > 3 ? `${flat.slice(0, 3)}.${flat.slice(3)}` : flat;
}

/**
 * Shape check only — says nothing about whether the code exists in FY2026.
 * Existence is settled by a lookup against `codes`; this just rejects obvious
 * junk before it reaches the database.
 *
 * The second character is deliberately not restricted to a digit. FY2026 added
 * the QA0 block (neurodevelopmental disorders tied to genetic variants), the
 * first ICD-10-CM codes to carry a letter in that position.
 */
export function isPlausibleIcd10(raw: string): boolean {
  return /^[A-Z][A-Z0-9][A-Z0-9][A-Z0-9]{0,4}$/.test(normalizeIcd10(raw));
}

type ChapterRange = { start: string; end: string; chapter: string };

/**
 * ICD-10-CM chapter boundaries, keyed by the 3-character category.
 * Plain string comparison is correct here: '0'-'9' sort before 'A' in ASCII,
 * so "O9A" lands after "O99" and the O00-O9A range behaves.
 */
const CHAPTER_RANGES: ChapterRange[] = [
  { start: "A00", end: "B99", chapter: "Certain infectious and parasitic diseases" },
  { start: "C00", end: "D49", chapter: "Neoplasms" },
  { start: "D50", end: "D89", chapter: "Diseases of the blood and blood-forming organs and certain disorders involving the immune mechanism" },
  { start: "E00", end: "E89", chapter: "Endocrine, nutritional and metabolic diseases" },
  { start: "F01", end: "F99", chapter: "Mental, behavioral and neurodevelopmental disorders" },
  { start: "G00", end: "G99", chapter: "Diseases of the nervous system" },
  { start: "H00", end: "H59", chapter: "Diseases of the eye and adnexa" },
  { start: "H60", end: "H95", chapter: "Diseases of the ear and mastoid process" },
  { start: "I00", end: "I99", chapter: "Diseases of the circulatory system" },
  { start: "J00", end: "J99", chapter: "Diseases of the respiratory system" },
  { start: "K00", end: "K95", chapter: "Diseases of the digestive system" },
  { start: "L00", end: "L99", chapter: "Diseases of the skin and subcutaneous tissue" },
  { start: "M00", end: "M99", chapter: "Diseases of the musculoskeletal system and connective tissue" },
  { start: "N00", end: "N99", chapter: "Diseases of the genitourinary system" },
  { start: "O00", end: "O9A", chapter: "Pregnancy, childbirth and the puerperium" },
  { start: "P00", end: "P96", chapter: "Certain conditions originating in the perinatal period" },
  // QA0 is FY2026's new genetic-variant block; it sorts after Q99 because
  // 'A' follows '9' in ASCII, so extending the range end covers it.
  { start: "Q00", end: "QA9", chapter: "Congenital malformations, deformations and chromosomal abnormalities" },
  { start: "R00", end: "R99", chapter: "Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified" },
  { start: "S00", end: "T88", chapter: "Injury, poisoning and certain other consequences of external causes" },
  { start: "U00", end: "U85", chapter: "Codes for special purposes" },
  { start: "V00", end: "Y99", chapter: "External causes of morbidity" },
  { start: "Z00", end: "Z99", chapter: "Factors influencing health status and contact with health services" },
];

/** Chapter title for a code, or null if it falls outside every published range. */
export function icd10Chapter(raw: string): string | null {
  const category = normalizeIcd10(raw).slice(0, 3);
  if (category.length < 3) return null;
  const hit = CHAPTER_RANGES.find((r) => category >= r.start && category <= r.end);
  return hit?.chapter ?? null;
}

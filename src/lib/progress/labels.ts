/**
 * Display names for hierarchy groups. Group slugs are derived from CMS's own
 * diagnosis-category tokens where one fits (see DECISIONS.md, Phase 1), so the
 * common ones are named here and anything else is sentence-cased.
 */
const KNOWN: Record<string, string> = {
  diabetes: "Diabetes",
  hf: "Heart failure",
  kidney: "Chronic kidney disease",
  "chr-lung": "Chronic lung disease",
  "card-resp-fail": "Cardio-respiratory failure",
  cancer: "Cancer",
  ulcer: "Skin ulcers",
  sepsis: "Sepsis",
  psychiatric: "Psychiatric",
  "sub-use-disorder": "Substance use disorder",
};

export function groupLabel(group: string): string {
  if (KNOWN[group]) return KNOWN[group];
  const words = group.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CodeMapping } from "./derive-hcc";

export interface CodeInfo {
  code: string;
  description: string;
  isBillable: boolean;
  mappings: CodeMapping[];
}

/**
 * Descriptions and HCC mappings for a set of codes in one payment year.
 * Public reference data only. Takes the client as a parameter so the editor
 * (user session) and the seed script (service role) share it.
 */
export async function lookupCodes(
  db: SupabaseClient<Database>,
  paymentYear: number,
  codes: readonly string[],
): Promise<Map<string, CodeInfo>> {
  const unique = [...new Set(codes)];
  const out = new Map<string, CodeInfo>();
  if (unique.length === 0) return out;

  const { data, error } = await db
    .from("icd10_codes")
    .select(
      "code, description, is_billable, icd_hcc_map(age_edit, sex_edit, mce_age_condition, hcc_categories(id, hcc_number, hcc_code, label, raf_community_nondual))",
    )
    .eq("payment_year", paymentYear)
    .in("code", unique);
  if (error) throw new Error(`Code lookup failed: ${error.message}`);

  for (const row of data) {
    const mappings: CodeMapping[] = row.icd_hcc_map.flatMap((m) =>
      m.hcc_categories
        ? [
            {
              hccCategoryId: m.hcc_categories.id,
              // Generated column; typed nullable by the generator, never null in practice.
              hccNumber: m.hcc_categories.hcc_number ?? Number(m.hcc_categories.hcc_code.slice(3)),
              hccCode: m.hcc_categories.hcc_code,
              label: m.hcc_categories.label,
              raf: Number(m.hcc_categories.raf_community_nondual),
              ageEdit: m.age_edit,
              sexEdit: m.sex_edit,
              mceAgeCondition: m.mce_age_condition,
            },
          ]
        : [],
    );
    out.set(row.code, {
      code: row.code,
      description: row.description,
      isBillable: row.is_billable,
      mappings: mappings.sort((a, b) => a.hccNumber - b.hccNumber),
    });
  }
  return out;
}

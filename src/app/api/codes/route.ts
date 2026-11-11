import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { searchHccSchema, type CodeOption } from "@/lib/practice/types";

const querySchema = z.object({
  q: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(2020).max(2100),
  hccOnly: z
    .enum(["1", "0", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

/**
 * GET /api/codes?q=&year=&hccOnly= — the encoder's typeahead.
 *
 * Public CMS reference data only: nothing here depends on a chart, so no
 * answer key can leak through it. Signed-in users only, so it is not an open
 * code-lookup API. Rate limiting arrives in Phase 5.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to search codes." }, { status: 401 });

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid search." }, { status: 400 });
  const { q, year, hccOnly } = parsed.data;

  const db = await createClient();
  const { data, error } = await db.rpc("search_icd10_codes", {
    q,
    p_payment_year: year,
    hcc_only: hccOnly,
    result_limit: 20,
  });
  if (error) return NextResponse.json({ error: "Search failed." }, { status: 500 });

  const results: CodeOption[] = data.map((row) => ({
    code: row.code,
    description: row.description,
    hccs: searchHccSchema.parse(row.hccs).map((h) => ({
      hcc: Number(h.hcc_code.slice(3)),
      code: h.hcc_code,
      label: h.label,
      ageEdit: h.age_edit,
      sexEdit: h.sex_edit,
      mceAgeCondition: h.mce_age_condition,
    })),
  }));

  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=300" } });
}

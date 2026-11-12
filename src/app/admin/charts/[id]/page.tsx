import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnswerKeyEditor, type KeyItemView } from "@/components/admin/answer-key-editor";
import { ChartMetaForm } from "@/components/admin/chart-meta-form";
import { DeleteChartControl, PublishControl } from "@/components/admin/chart-status-controls";
import { DistractorEditor, type DistractorView } from "@/components/admin/distractor-editor";
import { SectionsForm } from "@/components/admin/sections-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import type { SectionType } from "@/lib/charts/constants";
import { uuid } from "@/lib/charts/schemas";
import { ageOn } from "@/lib/hcc/resolve";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit chart · Admin" };

export default async function EditChartPage({ params }: PageProps<"/admin/charts/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: chart } = await supabase.from("charts").select("*").eq("id", id).maybeSingle();
  if (!chart) notFound();

  const [sectionsResult, keyResult, distractorResult, yearsResult] = await Promise.all([
    supabase.from("chart_sections").select("section_type, content").eq("chart_id", id),
    supabase
      .from("answer_key_items")
      .select("id, icd10_code, is_required, supporting_excerpt, rationale, trap_type, hcc_categories(hcc_code, label, raf_community_nondual)")
      .eq("chart_id", id)
      .order("created_at"),
    supabase.from("distractors").select("id, icd10_code, why_wrong, trap_type").eq("chart_id", id).order("created_at"),
    supabase.from("payment_years").select("year").eq("is_active", true).order("year", { ascending: false }),
  ]);
  for (const result of [sectionsResult, keyResult, distractorResult, yearsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const codes = [...(keyResult.data ?? []), ...(distractorResult.data ?? [])].map((r) => r.icd10_code);
  const { data: descriptions } = codes.length
    ? await supabase.from("icd10_codes").select("code, description").eq("payment_year", chart.payment_year).in("code", codes)
    : { data: [] };
  const describe = new Map((descriptions ?? []).map((d) => [d.code, d.description]));

  const sections: Partial<Record<SectionType, string>> = Object.fromEntries(
    (sectionsResult.data ?? []).map((s) => [s.section_type, s.content]),
  );
  const keyItems: KeyItemView[] = (keyResult.data ?? []).map((k) => ({
    id: k.id,
    icd10_code: k.icd10_code,
    description: describe.get(k.icd10_code) ?? null,
    hcc: k.hcc_categories
      ? { hcc_code: k.hcc_categories.hcc_code, label: k.hcc_categories.label, raf: Number(k.hcc_categories.raf_community_nondual) }
      : null,
    is_required: k.is_required,
    supporting_excerpt: k.supporting_excerpt,
    rationale: k.rationale,
    trap_type: k.trap_type,
  }));
  const distractors: DistractorView[] = (distractorResult.data ?? []).map((d) => ({
    ...d,
    description: describe.get(d.icd10_code) ?? null,
  }));
  const years = [...new Set([chart.payment_year, ...(yearsResult.data ?? []).map((y) => y.year)])];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/charts" className="text-[13px] text-accent-ink">
            ← Charts
          </Link>
          <h1 className="m-0 mt-2 text-xl font-semibold flex items-center gap-3">
            {chart.title}
            <Badge variant={chart.status === "published" ? "default" : "neutral"}>{chart.status}</Badge>
          </h1>
          <p className="m-0 mt-1 text-[13px] text-muted">
            PY{chart.payment_year} · {chart.specialty} · difficulty {chart.difficulty} · synthetic patient{" "}
            {ageOn(chart.patient_dob, chart.encounter_date)}
            {chart.patient_sex === "female" ? "F" : "M"} · {chart.patient_mrn}
          </p>
        </div>
        <PublishControl chartId={chart.id} status={chart.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Header facts shown above the chart. Age and sex drive CMS edits.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartMetaForm chart={chart} years={years} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chart text</CardTitle>
          <CardDescription>The progress note the learner codes from.</CardDescription>
        </CardHeader>
        <CardContent>
          <SectionsForm chartId={chart.id} sections={sections} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Answer key</CardTitle>
          <CardDescription>
            Never sent to a learner before they submit. The HCC is resolved from the PY{chart.payment_year} map for this
            patient; scoring applies the hierarchy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnswerKeyEditor chartId={chart.id} items={keyItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distractors</CardTitle>
          <CardDescription>Plausible wrong codes, explained after submission.</CardDescription>
        </CardHeader>
        <CardContent>
          <DistractorEditor chartId={chart.id} items={distractors} />
        </CardContent>
      </Card>

      <div className="flex justify-end border-t border-border pt-6">
        <DeleteChartControl chartId={chart.id} title={chart.title} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { lookupCodes } from "@/lib/charts/code-lookup";
import { applicableMappings } from "@/lib/charts/derive-hcc";
import { chartReadiness } from "@/lib/charts/readiness";
import { ageForPaymentYear } from "@/lib/hcc/age";
import { AnswerKeyPanel, ChartActions, DetailsPanel, DistractorsPanel, ReadinessPanel, SectionsPanel } from "./panels";
import type { CodeView } from "./panels";

export default async function ChartEditorPage({ params }: PageProps<"/admin/charts/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = await createClient();
  const [chartResult, sectionsResult, keyResult, distractorsResult, yearsResult] = await Promise.all([
    db.from("charts").select("*").eq("id", id).maybeSingle(),
    db.from("chart_sections").select("*").eq("chart_id", id).order("sort_order"),
    db.from("answer_key_items").select("*").eq("chart_id", id).order("created_at"),
    db.from("distractors").select("*").eq("chart_id", id).order("created_at"),
    db.from("payment_years").select("year, hcc_model_version").order("year", { ascending: false }),
  ]);
  for (const result of [chartResult, sectionsResult, keyResult, distractorsResult, yearsResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const chart = chartResult.data;
  if (!chart) notFound();

  const sections = sectionsResult.data ?? [];
  const answerKey = keyResult.data ?? [];
  const distractors = distractorsResult.data ?? [];
  const paymentYears = yearsResult.data ?? [];

  const patient = { age: ageForPaymentYear(chart.patient_dob, chart.payment_year), sex: chart.patient_sex };
  const info = await lookupCodes(db, chart.payment_year, [
    ...answerKey.map((k) => k.icd10_code),
    ...distractors.map((d) => d.icd10_code),
  ]);
  const codeViews = new Map<string, CodeView>(
    [...info.values()].map((c) => [
      c.code,
      {
        description: c.description,
        hccs: applicableMappings(c.mappings, patient).map((m) => ({ code: m.hccCode, label: m.label, raf: m.raf })),
      },
    ]),
  );

  const checks = chartReadiness({
    isSynthetic: chart.is_synthetic,
    paymentYear: chart.payment_year,
    encounterDate: chart.encounter_date,
    sections: sections.map((s) => ({ sectionType: s.section_type, content: s.content })),
    answerKey: answerKey.map((k) => ({
      icd10Code: k.icd10_code,
      isRequired: k.is_required,
      supportingExcerpt: k.supporting_excerpt,
    })),
    distractors: distractors.map((d) => ({ icd10Code: d.icd10_code })),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/admin/charts" className="text-[13px] text-muted hover:text-ink">
            ← All charts
          </Link>
          <h1 className="flex items-center gap-3 text-xl font-semibold">
            {chart.title}
            <Badge variant={chart.status === "published" ? "default" : "outline"}>{chart.status}</Badge>
          </h1>
          <p className="text-[13px] text-muted">
            PY{chart.payment_year} · patient age {patient.age} on Feb 1, {chart.payment_year} (the age CMS
            applies to diagnosis edits)
          </p>
        </div>
        <ChartActions chartId={chart.id} status={chart.status} />
      </div>

      <ReadinessPanel checks={checks} />
      <DetailsPanel chart={chart} paymentYears={paymentYears} yearLocked={answerKey.length + distractors.length > 0} />
      <SectionsPanel chartId={chart.id} sections={sections} />
      <AnswerKeyPanel chartId={chart.id} items={answerKey} codes={codeViews} />
      <DistractorsPanel chartId={chart.id} items={distractors} codes={codeViews} />
    </div>
  );
}

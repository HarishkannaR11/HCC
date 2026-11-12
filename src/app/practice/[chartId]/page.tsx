import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encoder, type EncoderResume } from "@/components/workspace/Encoder";
import { Paywall } from "@/components/paywall";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loadEncoderChart, loadHierarchy, loadOpenAttempt, lookupCodes, nextPublishedChartId } from "@/lib/practice/queries";

export const metadata: Metadata = { title: "Coding" };

/**
 * The encoder. Everything here is read through the learner's own session:
 * the published chart (RLS), public reference data, and the learner's own open
 * attempt. The answer key is never read on this page.
 */
export default async function EncoderPage({ params }: PageProps<"/practice/[chartId]">) {
  const { chartId } = await params;
  const user = await requireUser(`/practice/${chartId}`);
  if (!/^[0-9a-f-]{36}$/i.test(chartId)) notFound();

  const db = await createClient();
  // The plan check comes first: a locked chart's text is never loaded (RLS
  // would withhold it anyway).
  const [{ data: access }, { data: listing }] = await Promise.all([
    db.rpc("chart_access", { p_chart_id: chartId }),
    db.from("charts").select("title").eq("id", chartId).eq("status", "published").maybeSingle(),
  ]);
  if (!listing) notFound();
  if (!access) {
    const { data: ent } = await db.rpc("my_entitlement");
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader user={user} />
        <main className="flex flex-1 items-center px-6 py-16">
          <Paywall title={listing.title} freeLimit={ent?.[0]?.free_limit ?? 5} />
        </main>
      </div>
    );
  }

  const chart = await loadEncoderChart(db, chartId);
  if (!chart) notFound();

  const [hierarchy, open, nextChartId] = await Promise.all([
    loadHierarchy(db, chart.paymentYear),
    loadOpenAttempt(db, user.id, chartId),
    nextPublishedChartId(db, chartId),
  ]);

  const saved = open ? await lookupCodes(db, chart.paymentYear, open.codes.map((c) => c.code)) : new Map();
  const resume: EncoderResume = {
    attemptId: open?.id ?? null,
    startedAt: open?.startedAt ?? null,
    mode: open?.mode ?? "practice",
    timeLimitSeconds: open?.timeLimitSeconds ?? null,
    assigned: (open?.codes ?? []).flatMap((c) => {
      const info = saved.get(c.code);
      return info ? [{ code: c.code, description: info.description, hccs: info.hccs, rationale: c.rationale }] : [];
    }),
    excerpts: Object.fromEntries((open?.codes ?? []).map((c) => [c.code, c.excerpt])),
  };

  return <Encoder chart={chart} hierarchy={hierarchy} nextChartId={nextChartId} resume={resume} />;
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { TRAP_LABELS, type TrapType } from "@/lib/charts/constants";
import { breakdownSchema, type Breakdown } from "@/lib/practice/breakdown";
import { lookupCodes, nextPublishedChartId } from "@/lib/practice/queries";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CodeVerdict } from "@/lib/scoring/review";
import { NextChartShortcut } from "./next-chart-shortcut";

export const metadata: Metadata = { title: "Result" };

const VERDICT: Record<CodeVerdict, { label: string; variant: "default" | "neutral" | "warn" | "destructive" }> = {
  correct: { label: "Correct", variant: "default" },
  optional: { label: "Accepted (optional)", variant: "neutral" },
  distractor: { label: "Planted trap", variant: "destructive" },
  unlisted: { label: "Not on the key", variant: "warn" },
  missed: { label: "Missed", variant: "destructive" },
};

const f3 = (n: number) => n.toFixed(3);
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(3)}`;

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The result of one submitted attempt. Every number comes from the scoring
 * snapshot written at submission, so it is reproducible by hand and does not
 * drift if the key is edited later. The key's rationale and the distractor
 * explanations are read with the service role, only after confirming the
 * attempt is the viewer's own and already submitted.
 */
export default async function ResultPage({ params }: PageProps<"/practice/[chartId]/result/[attemptId]">) {
  const { chartId, attemptId } = await params;
  const user = await requireUser(`/practice/${chartId}/result/${attemptId}`);
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();

  const db = await createClient();
  const { data: attempt } = await db
    .from("attempts")
    .select(
      "id, chart_id, mode, time_limit_seconds, submitted_at, duration_seconds, attempt_results(score_pct, breakdown), attempt_codes(icd10_code, supporting_excerpt, user_rationale), charts(title)",
    )
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attempt) notFound();
  if (!attempt.submitted_at || !attempt.attempt_results) redirect(`/practice/${attempt.chart_id}`);

  const parsed = breakdownSchema.safeParse(attempt.attempt_results.breakdown);
  if (!parsed.success) throw new Error("This attempt's scoring snapshot is unreadable.");
  const b: Breakdown = parsed.data;
  const s = b.score;

  // Verified own + submitted: the teaching content may now be read.
  const service = createServiceRoleClient();
  const [{ data: key }, { data: distractors }] = await Promise.all([
    service
      .from("answer_key_items")
      .select("icd10_code, is_required, supporting_excerpt, rationale, trap_type")
      .eq("chart_id", attempt.chart_id),
    service.from("distractors").select("icd10_code, why_wrong, trap_type").eq("chart_id", attempt.chart_id),
  ]);
  const keyByCode = new Map((key ?? []).map((k) => [k.icd10_code, k]));
  const distractorByCode = new Map((distractors ?? []).map((d) => [d.icd10_code, d]));
  const mine = new Map(attempt.attempt_codes.map((c) => [c.icd10_code, c]));

  const allCodes = [...b.review.lines.map((l) => l.code), ...(distractors ?? []).map((d) => d.icd10_code)];
  const [descriptions, nextChartId] = await Promise.all([
    lookupCodes(db, b.paymentYear, allCodes),
    nextPublishedChartId(db, attempt.chart_id),
  ]);
  const describe = (code: string) => descriptions.get(code)?.description ?? "";

  const label = (hcc: number) => s.hccLabels[String(hcc)];
  const raf = (hcc: number) => label(hcc)?.raf ?? 0;
  const captured = new Set(s.captured);
  const avoided = (distractors ?? []).filter((d) => !mine.has(d.icd10_code));

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/practice" className="text-[13px] text-muted hover:text-ink">
              ← Practice charts
            </Link>
            <h1 className="m-0 mt-1 text-xl font-semibold">{attempt.charts?.title ?? "Chart"}</h1>
            <p className="m-0 mt-1 text-[13px] text-muted">
              PY{b.paymentYear} · CMS-HCC V28 · patient {b.patient.age} y {b.patient.sex}
              {attempt.mode === "timed" && attempt.time_limit_seconds !== null && attempt.duration_seconds !== null
                ? attempt.duration_seconds <= attempt.time_limit_seconds
                  ? ` · Timed: ${formatDuration(attempt.duration_seconds)} of ${formatDuration(attempt.time_limit_seconds)}`
                  : ` · Timed: over the ${formatDuration(attempt.time_limit_seconds)} limit by ${formatDuration(attempt.duration_seconds - attempt.time_limit_seconds)}`
                : attempt.duration_seconds !== null
                  ? ` · ${formatDuration(attempt.duration_seconds)} on this chart`
                  : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/practice/${attempt.chart_id}`}
              className="rounded-[6px] border border-border bg-surface px-3 py-2 text-[13px] font-medium"
            >
              Code it again
            </Link>
            {nextChartId ? (
              <Link href={`/practice/${nextChartId}`} className="rounded-[6px] bg-accent px-3 py-2 text-[13px] font-medium text-white">
                Next chart <kbd className="ml-1 font-mono opacity-70">N</kbd>
              </Link>
            ) : null}
            {nextChartId ? <NextChartShortcut href={`/practice/${nextChartId}`} /> : null}
          </div>
        </div>

        {/* Score and the arithmetic behind it */}
        <section className="grid gap-4 rounded-card border border-border bg-surface p-5 md:grid-cols-[180px_1fr]">
          <div className="flex flex-col justify-center">
            <span className="text-[13px] text-muted">Score</span>
            <span className="font-mono text-[44px] font-semibold leading-none text-accent">{s.scorePct.toFixed(2)}%</span>
          </div>
          <div className="flex flex-col gap-1.5 font-mono text-[13px] text-ink/90">
            <span>
              Recall = captured ÷ (captured + missed) = {s.captured.length} ÷ {s.captured.length + s.missed.length} ={" "}
              <b>{f3(s.recall)}</b>
            </span>
            <span>
              Precision = captured ÷ (captured + over-coded) = {s.captured.length} ÷ {s.captured.length + s.overCoded.length} ={" "}
              <b>{f3(s.precision)}</b>
            </span>
            <span>
              RAF accuracy = 1 − |Δ| ÷ key RAF = 1 − {f3(Math.abs(s.rafDelta))} ÷ {f3(s.key.raf)} = <b>{f3(s.rafAccuracy)}</b>
            </span>
            <span className="mt-1 border-t border-border pt-1.5">
              Score = {s.weights.recall} × {f3(s.recall)} + {s.weights.precision} × {f3(s.precision)} + {s.weights.raf} ×{" "}
              {f3(s.rafAccuracy)} = <b>{s.scorePct.toFixed(2)}%</b>
            </span>
            <span className="text-[12px] text-muted">
              Denominators of 0 count as 1 (spec). HCCs are compared after each side&rsquo;s V28 hierarchy trimming.
            </span>
          </div>
        </section>

        {/* RAF side by side */}
        <section className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["Your HCCs", s.user],
              ["Answer key HCCs", s.key],
            ] as const
          ).map(([title, side]) => (
            <div key={title} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
              <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
                {side.hccs.length === 0 ? <li className="text-muted">No HCCs.</li> : null}
                {side.hccs.map((hcc) => (
                  <li key={hcc} className="flex items-baseline gap-2">
                    <span className={`w-16 font-mono font-semibold ${title === "Your HCCs" && !captured.has(hcc) ? "text-warn-ink" : ""}`}>
                      HCC{hcc}
                    </span>
                    <span className="flex-1 text-ink/85">{label(hcc)?.label}</span>
                    <span className="font-mono">{f3(raf(hcc))}</span>
                  </li>
                ))}
                {side.trimmed.map((t) => (
                  <li key={`t${t.hcc}`} className="flex items-baseline gap-2 text-muted">
                    <span className="w-16 font-mono line-through">HCC{t.hcc}</span>
                    <span className="flex-1">trimmed by HCC{t.suppressedBy} (V28 hierarchy)</span>
                    <span className="font-mono">0.000</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-baseline justify-between border-t border-border pt-2 font-mono text-[13px]">
                <span className="text-muted">{side.hccs.map((h) => f3(raf(h))).join(" + ") || "0"}</span>
                <span className="text-[17px] font-semibold">{f3(side.raf)}</span>
              </div>
            </div>
          ))}
        </section>
        <p className="m-0 -mt-3 text-[13px] text-muted">
          RAF Δ (yours − key) = <span className="font-mono">{signed(s.rafDelta)}</span>. Community non-dual aged coefficients;
          demographic factors excluded.
        </p>

        {/* HCC verdicts */}
        <section className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Captured", s.captured, "default"],
              ["Missed", s.missed, "destructive"],
              ["Over-coded", s.overCoded, "warn"],
            ] as const
          ).map(([title, hccs, variant]) => (
            <div key={title} className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="m-0 text-[14px] font-semibold">{title}</h2>
                <span className="font-mono text-[18px] font-semibold">{hccs.length}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {hccs.map((h) => (
                  <Badge key={h} variant={variant} title={label(h)?.label}>
                    HCC{h}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Code-level review */}
        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-[16px] font-semibold">Code by code</h2>
          {b.review.lines.map((line) => {
            const k = keyByCode.get(line.code);
            const d = distractorByCode.get(line.code);
            const m = mine.get(line.code);
            const verdict = VERDICT[line.verdict];
            return (
              <article key={line.code} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] font-semibold">{line.code}</span>
                  <Badge variant={verdict.variant}>{verdict.label}</Badge>
                  {line.trap && line.trap !== "none" ? (
                    <Badge variant="neutral">Trap: {TRAP_LABELS[line.trap as TrapType]}</Badge>
                  ) : null}
                  {s.noHccImpact.includes(line.code) ? <span className="text-[12px] text-muted">no HCC impact</span> : null}
                  <span className="text-[13px] text-ink/80">{describe(line.code)}</span>
                </div>
                {d && line.verdict === "distractor" ? (
                  <p className="m-0 text-[14px] leading-relaxed">
                    <b>Why it is wrong:</b> {d.why_wrong}
                  </p>
                ) : null}
                {k?.rationale ? (
                  <p className="m-0 text-[14px] leading-relaxed">
                    <b>{line.verdict === "missed" ? "What you missed:" : "Why:"}</b> {k.rationale}
                  </p>
                ) : null}
                {k?.supporting_excerpt ? (
                  <p className="m-0 text-[13px]">
                    <span className="text-muted">Key support: </span>
                    <span className="font-serif italic">“{k.supporting_excerpt}”</span>
                  </p>
                ) : null}
                {m?.supporting_excerpt ? (
                  <p className="m-0 text-[13px]">
                    <span className="text-muted">Your evidence: </span>
                    <span className="font-serif italic">“{m.supporting_excerpt}”</span>
                  </p>
                ) : null}
                {m?.user_rationale ? (
                  <p className="m-0 text-[13px]">
                    <span className="text-muted">Your rationale: </span>
                    {m.user_rationale}
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>

        {avoided.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="m-0 text-[16px] font-semibold">Traps you avoided</h2>
            {avoided.map((d) => (
              <article key={d.icd10_code} className="flex flex-col gap-1.5 rounded-card border border-border bg-surface-alt p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[14px] font-semibold">{d.icd10_code}</span>
                  {d.trap_type !== "none" ? <Badge variant="neutral">Trap: {TRAP_LABELS[d.trap_type]}</Badge> : null}
                  <span className="text-[13px] text-ink/80">{describe(d.icd10_code)}</span>
                </div>
                <p className="m-0 text-[14px] leading-relaxed text-ink/90">{d.why_wrong}</p>
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}

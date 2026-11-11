import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ScoreTrendChart, type TrendDatum } from "@/components/progress/score-trend-chart";
import { requireUser } from "@/lib/auth/session";
import { TRAP_LABELS } from "@/lib/charts/constants";
import { codingBalance, familyStats, modeStats, scoreTrend, trapStats } from "@/lib/progress/analytics";
import { buildInsights, MIN_ATTEMPTS_FOR_INSIGHTS, type Insight } from "@/lib/progress/insights";
import { groupLabel } from "@/lib/progress/labels";
import { loadProgress } from "@/lib/progress/load";
import { recommendNextChart } from "@/lib/progress/recommend";
import { computeStreaks, localDate } from "@/lib/progress/streaks";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const METER_COLOR = "#2a78d6";

function formatMinutes(seconds: number | null): string {
  if (seconds === null) return "—";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border bg-surface px-4 py-3">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="font-mono text-[26px] font-semibold leading-none text-ink">{value}</span>
      {note ? <span className="text-[12px] text-muted">{note}</span> : null}
    </div>
  );
}

const INSIGHT_STYLE: Record<Insight["kind"], string> = {
  weakness: "border-l-destructive",
  strength: "border-l-accent",
  trend: "border-l-border",
};

/**
 * Progress: accuracy over time, streaks, weak spots by documentation trap and
 * HCC family, and the next chart. Every figure is computed from the learner's
 * own scored attempts by deterministic rules (src/lib/progress).
 */
export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const db = await createClient();
  const progress = await loadProgress(db, user.id);
  const { attempts, timezone } = progress;

  const today = localDate(new Date(), timezone);
  const streaks = computeStreaks(progress.activityDates, today);
  const trend = scoreTrend(attempts);
  const traps = trapStats(attempts).filter((t) => t.trap !== "none");
  const groupOf = (hcc: number) => progress.hccInfo.get(hcc)?.group ?? `hcc-${hcc}`;
  const families = familyStats(attempts, groupOf);
  const balance = codingBalance(attempts);
  const modes = modeStats(attempts);
  const insights = buildInsights(attempts, groupOf, groupLabel, (h) => `HCC${h}`);
  const next = recommendNextChart({ charts: progress.charts, attempts, openDraftChartIds: progress.openDraftChartIds });

  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: timezone });
  const trendData: TrendDatum[] = trend.points.map((p) => ({
    id: p.attemptId,
    date: dateFmt.format(new Date(p.submittedAt)),
    chartTitle: p.chartTitle,
    mode: p.mode,
    score: p.scorePct,
    rolling: p.rolling,
  }));
  const delta = trend.recentAvg !== null && trend.previousAvg !== null ? trend.recentAvg - trend.previousAvg : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="m-0 text-xl font-semibold">Your progress</h1>
            <p className="m-0 mt-1 text-[13px] text-muted">
              From your scored charts. Days follow your time zone ({timezone}).
            </p>
          </div>
          {next ? (
            <div className="flex max-w-md flex-col gap-2 rounded-card border border-accent bg-accent-soft/40 px-4 py-3">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-accent-ink">Next up</span>
              <span className="font-medium">{next.title}</span>
              <span className="text-[13px] text-ink/80">{next.reason}</span>
              <Link
                href={`/practice/${next.chartId}`}
                className="self-start rounded-[6px] bg-accent px-3 py-1.5 text-[13px] font-medium text-white"
              >
                Open chart
              </Link>
            </div>
          ) : null}
        </div>

        {attempts.length === 0 ? (
          <section className="rounded-card border border-border bg-surface px-5 py-8 text-center">
            <p className="m-0 text-[15px]">No scored charts yet.</p>
            <p className="m-0 mt-1 text-[13px] text-muted">
              Code your first chart and this page starts tracking your accuracy, streak and weak spots.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
              <Tile label="Charts scored" value={String(attempts.length)} />
              <Tile
                label={`Average, last ${Math.min(5, attempts.length)}`}
                value={`${Math.round(trend.recentAvg ?? 0)}%`}
                note={delta !== null ? `${delta >= 0 ? "+" : "−"}${Math.abs(Math.round(delta))} vs the 5 before` : undefined}
              />
              <Tile
                label="Streak"
                value={`${streaks.current} day${streaks.current === 1 ? "" : "s"}`}
                note={`${streaks.activeToday ? "Charted today" : streaks.current > 0 ? "Chart today to keep it" : "Start one today"} · best ${streaks.longest}`}
              />
              <Tile
                label="Timed charts"
                value={String(modes.timed.count)}
                note={
                  modes.timed.count > 0
                    ? `${modes.timed.withinLimit} within the limit · avg ${formatMinutes(modes.timed.meanSeconds)}`
                    : "Try one from any chart's top bar"
                }
              />
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="m-0 text-[16px] font-semibold">Weak spots</h2>
                {attempts.length < MIN_ATTEMPTS_FOR_INSIGHTS ? (
                  <span className="text-[12px] text-muted">
                    Provisional: {MIN_ATTEMPTS_FOR_INSIGHTS - attempts.length} more chart
                    {MIN_ATTEMPTS_FOR_INSIGHTS - attempts.length === 1 ? "" : "s"} to sharpen these
                  </span>
                ) : null}
              </div>
              {insights.length === 0 ? (
                <p className="m-0 text-[13px] text-muted">No pattern stands out yet. Keep coding.</p>
              ) : (
                <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
                  {insights.map((insight) => (
                    <li key={insight.id} className={`rounded-card border border-l-4 border-border bg-surface px-4 py-3 ${INSIGHT_STYLE[insight.kind]}`}>
                      <p className="m-0 text-[14px] font-semibold">{insight.title}</p>
                      <p className="m-0 mt-1 text-[13px] leading-relaxed text-ink/85">{insight.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
              <h2 className="m-0 text-[16px] font-semibold">Accuracy over time</h2>
              <ScoreTrendChart data={trendData} />
              <details className="text-[13px]">
                <summary className="cursor-pointer text-muted">Show as a table</summary>
                <table className="mt-2 w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[12px] text-muted">
                      <th className="py-1 font-medium">Date</th>
                      <th className="py-1 font-medium">Chart</th>
                      <th className="py-1 font-medium">Mode</th>
                      <th className="py-1 text-right font-medium">Score</th>
                      <th className="py-1 text-right font-medium">3-chart avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendData.map((d) => (
                      <tr key={d.id} className="border-t border-border">
                        <td className="py-1">{d.date}</td>
                        <td className="py-1">
                          <Link href={`/practice/${attempts.find((a) => a.id === d.id)?.chartId}/result/${d.id}`} className="text-accent-ink hover:underline">
                            {d.chartTitle}
                          </Link>
                        </td>
                        <td className="py-1">{d.mode === "timed" ? "Timed" : "Practice"}</td>
                        <td className="py-1 text-right font-mono">{d.score.toFixed(2)}%</td>
                        <td className="py-1 text-right font-mono">{d.rolling.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
                <div>
                  <h2 className="m-0 text-[16px] font-semibold">Documentation traps</h2>
                  <p className="m-0 mt-1 text-[12px] text-muted">How often each kind of trap caught you, when it was on the chart.</p>
                </div>
                {traps.length === 0 ? (
                  <p className="m-0 text-[13px] text-muted">No traps met yet.</p>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {traps.map((t) => (
                      <li key={t.trap} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                        <span className="text-[13px]">{TRAP_LABELS[t.trap]}</span>
                        <span className="font-mono text-[12px] text-ink/80">
                          {t.hits} of {t.opportunities}
                        </span>
                        <span className="col-span-2 h-2 overflow-hidden rounded-full bg-border/60" aria-hidden="true">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${Math.max(t.rate * 100, t.hits > 0 ? 4 : 0)}%`, background: METER_COLOR }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
                <div>
                  <h2 className="m-0 text-[16px] font-semibold">HCC families</h2>
                  <p className="m-0 mt-1 text-[12px] text-muted">
                    Missed and over-coded HCCs after hierarchy trimming. Recall averages {Math.round(balance.meanRecall * 100)}%, precision{" "}
                    {Math.round(balance.meanPrecision * 100)}%; mean RAF Δ {balance.meanRafDelta >= 0 ? "+" : "−"}
                    {Math.abs(balance.meanRafDelta).toFixed(3)}.
                  </p>
                </div>
                {families.length === 0 ? (
                  <p className="m-0 text-[13px] text-muted">Every HCC on your keys so far was captured, and nothing was over-coded.</p>
                ) : (
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="text-left text-[12px] text-muted">
                        <th className="py-1 font-medium">Family</th>
                        <th className="py-1 text-right font-medium">On key</th>
                        <th className="py-1 text-right font-medium">Missed</th>
                        <th className="py-1 text-right font-medium">Over-coded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {families.map((f) => (
                        <tr key={f.group} className="border-t border-border align-top">
                          <td className="py-1.5">
                            {groupLabel(f.group)}
                            <span className="block text-[12px] text-muted">
                              {[...f.missedHccs.map((h) => `HCC${h} missed`), ...f.overCodedHccs.map((h) => `HCC${h} over-coded`)].join(" · ")}
                            </span>
                          </td>
                          <td className="py-1.5 text-right font-mono">{f.onKey}</td>
                          <td className="py-1.5 text-right font-mono">{f.missed}</td>
                          <td className="py-1.5 text-right font-mono">{f.overCoded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

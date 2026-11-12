import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { breakdownSchema } from "@/lib/practice/breakdown";
import type { AttemptSummary, ChartListing } from "./types";

type Db = SupabaseClient<Database>;
const hccNumber = (code: string) => Number(code.replace(/^HCC/, ""));

export interface ProgressData {
  attempts: AttemptSummary[];
  activityDates: string[];
  timezone: string;
  charts: ChartListing[];
  openDraftChartIds: string[];
  /** HCC number -> hierarchy group and label, for the years the learner has practised. */
  hccInfo: Map<number, { group: string; label: string }>;
}

/**
 * Everything the dashboard needs, read through the learner's own session: RLS
 * limits it to their attempts, their activity and published charts. The
 * key-derived parts (key HCCs, traps) come from their own submitted attempts'
 * scoring snapshots, which they have already seen on their result screens.
 */
export async function loadProgress(db: Db, userId: string): Promise<ProgressData> {
  const [attemptsResult, activityResult, profileResult, chartsResult] = await Promise.all([
    db
      .from("attempts")
      .select(
        "id, chart_id, mode, submitted_at, duration_seconds, time_limit_seconds, attempt_results(score_pct, recall, precision, raf_delta, raf_key, captured, missed, over_coded, breakdown), charts(title, specialty, difficulty, payment_year)",
      )
      .eq("user_id", userId)
      .order("submitted_at", { ascending: true }),
    db.from("daily_activity").select("activity_date").eq("user_id", userId),
    db.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    db.from("charts").select("id, title, specialty, difficulty").eq("status", "published").order("difficulty").order("title"),
  ]);
  if (attemptsResult.error) throw new Error(attemptsResult.error.message);

  const rows = attemptsResult.data ?? [];
  const attempts: AttemptSummary[] = [];
  const years = new Set<number>();

  for (const row of rows) {
    const result = row.attempt_results;
    if (!row.submitted_at || !result) continue;
    const parsed = breakdownSchema.safeParse(result.breakdown);
    const fromArrays = (codes: string[]) => codes.map(hccNumber);
    const score = parsed.success ? parsed.data.score : null;
    if (row.charts) years.add(row.charts.payment_year);

    attempts.push({
      id: row.id,
      chartId: row.chart_id,
      chartTitle: row.charts?.title ?? "Unpublished chart",
      specialty: row.charts?.specialty ?? "",
      difficulty: row.charts?.difficulty ?? 1,
      mode: row.mode,
      submittedAt: row.submitted_at,
      durationSeconds: row.duration_seconds,
      timeLimitSeconds: row.time_limit_seconds,
      scorePct: Number(result.score_pct),
      recall: Number(result.recall),
      precision: Number(result.precision),
      rafDelta: Number(result.raf_delta),
      rafKey: Number(result.raf_key),
      // The snapshot is the source of truth; the stored arrays are the fallback.
      keyHccs: score?.key.hccs ?? [...fromArrays(result.captured), ...fromArrays(result.missed)],
      captured: score?.captured ?? fromArrays(result.captured),
      missed: score?.missed ?? fromArrays(result.missed),
      overCoded: score?.overCoded ?? fromArrays(result.over_coded),
      trapsHit: parsed.success ? parsed.data.review.trapsHit : [],
      trapsAvoided: parsed.success ? parsed.data.review.trapsAvoided : [],
    });
  }

  const hccInfo = new Map<number, { group: string; label: string }>();
  if (years.size > 0) {
    const { data: categories } = await db
      .from("hcc_categories")
      .select("hcc_code, label, hierarchy_group, payment_year")
      .in("payment_year", [...years]);
    for (const c of categories ?? []) hccInfo.set(hccNumber(c.hcc_code), { group: c.hierarchy_group, label: c.label });
  }

  return {
    attempts,
    activityDates: (activityResult.data ?? []).map((a) => a.activity_date),
    timezone: profileResult.data?.timezone ?? "UTC",
    charts: chartsResult.data ?? [],
    openDraftChartIds: rows.filter((r) => !r.submitted_at).map((r) => r.chart_id),
    hccInfo,
  };
}

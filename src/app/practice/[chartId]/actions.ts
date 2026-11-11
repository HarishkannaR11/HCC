"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ageOn } from "@/lib/hcc/resolve";
import { formatIcd10, isPlausibleIcd10 } from "@/lib/icd10";
import { buildReferenceSlice } from "@/lib/scoring/reference";
import { scoreAttempt } from "@/lib/scoring/score";
import { reviewCodes } from "@/lib/scoring/review";
import { makeBreakdown } from "@/lib/practice/breakdown";
import { loadHierarchy, lookupCodes, mappingsFor } from "@/lib/practice/queries";
import { saveDraftSchema, submitAttemptSchema } from "@/lib/practice/types";

/**
 * The practice loop's three mutations. Each is a public POST endpoint, so
 * each re-authenticates and validates. Starting and drafting run as the
 * learner (RLS: own open attempt on a published chart). Submitting scores on
 * the server and writes through the service role, so no learner can forge a
 * submission or a score, and the answer key is read only here and never
 * returned.
 */

type Failure = { error: string };

function normalise(entries: { code: string; excerpt: string; rationale: string }[]) {
  const codes = new Map<string, { excerpt: string; rationale: string }>();
  for (const entry of entries) {
    if (!isPlausibleIcd10(entry.code)) return { error: `${entry.code} is not an ICD-10-CM code.` } as Failure;
    const code = formatIcd10(entry.code);
    if (!codes.has(code)) codes.set(code, { excerpt: entry.excerpt.trim().slice(0, 2000), rationale: entry.rationale.trim() });
  }
  return codes;
}

export interface StartedAttempt {
  attemptId: string;
  startedAt: string;
  mode: "practice" | "timed";
  timeLimitSeconds: number | null;
}

const startSchema = z.object({ chartId: z.uuid(), mode: z.enum(["practice", "timed"]).default("practice") });

/**
 * Open (or resume) this learner's attempt on a chart. started_at comes from
 * the database clock and a timed attempt's limit from the database, so
 * neither can be chosen by the learner. An open attempt keeps its mode.
 */
export async function startAttempt(input: unknown): Promise<StartedAttempt | Failure> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has expired. Sign in again." };
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid chart." };
  const id = { data: parsed.data.chartId };
  const started = (row: { id: string; started_at: string; mode: string; time_limit_seconds: number | null }): StartedAttempt => ({
    attemptId: row.id,
    startedAt: row.started_at,
    mode: row.mode === "timed" ? "timed" : "practice",
    timeLimitSeconds: row.time_limit_seconds,
  });

  const db = await createClient();
  const columns = "id, started_at, mode, time_limit_seconds";
  const existing = await db
    .from("attempts")
    .select(columns)
    .eq("user_id", user.id)
    .eq("chart_id", id.data)
    .is("submitted_at", null)
    .maybeSingle();
  if (existing.data) return started(existing.data);

  const { data, error } = await db
    .from("attempts")
    .insert({ user_id: user.id, chart_id: id.data, mode: parsed.data.mode })
    .select(columns)
    .single();
  if (error?.code === "23505") {
    // Another tab opened it first: use that one.
    const again = await db.from("attempts").select(columns).eq("user_id", user.id).eq("chart_id", id.data).is("submitted_at", null).single();
    if (again.data) return started(again.data);
  }
  if (error || !data) return { error: "This chart is not available for practice." };
  return started(data);
}

/** Save the tray as it stands. RLS limits this to the learner's own open attempt. */
export async function saveDraft(input: unknown): Promise<{ ok: true } | Failure> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has expired. Sign in again." };
  const parsed = saveDraftSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid draft." };
  const codes = normalise(parsed.data.codes);
  if ("error" in codes) return codes as Failure;

  const db = await createClient();
  const { attemptId } = parsed.data;
  const keep = [...codes.keys()];

  const removal = db.from("attempt_codes").delete().eq("attempt_id", attemptId);
  const { error: deleteError } = keep.length > 0 ? await removal.not("icd10_code", "in", `(${keep.map((c) => `"${c}"`).join(",")})`) : await removal;
  if (deleteError) return { error: "Could not save your draft." };

  if (keep.length > 0) {
    const { error } = await db.from("attempt_codes").upsert(
      keep.map((code) => ({
        attempt_id: attemptId,
        icd10_code: code,
        supporting_excerpt: codes.get(code)!.excerpt || null,
        user_rationale: codes.get(code)!.rationale || null,
      })),
      { onConflict: "attempt_id,icd10_code" },
    );
    if (error) return { error: "Could not save your draft." };
  }
  return { ok: true };
}

/** Score and record the attempt, then go to its result. Returns a message instead on failure. */
export async function submitAttempt(input: unknown): Promise<Failure> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has expired. Sign in again to submit." };
  const parsed = submitAttemptSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid submission." };
  const codes = normalise(parsed.data.codes);
  if ("error" in codes) return codes as Failure;
  const { attemptId } = parsed.data;

  // Ownership and visibility through the learner's own session.
  const db = await createClient();
  const { data: attempt } = await db
    .from("attempts")
    .select("id, chart_id, submitted_at, charts(payment_year, patient_dob, patient_sex, encounter_date, status)")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attempt || !attempt.charts) return { error: "This attempt is not available." };
  if (attempt.submitted_at) redirect(`/practice/${attempt.chart_id}/result/${attempt.id}`);
  const chart = attempt.charts;
  if (chart.status !== "published") return { error: "This chart is no longer available for practice." };

  // Only now, for a verified open attempt of this learner, read the key.
  const service = createServiceRoleClient();
  const [keyResult, distractorResult] = await Promise.all([
    service.from("answer_key_items").select("icd10_code, is_required, trap_type").eq("chart_id", attempt.chart_id),
    service.from("distractors").select("icd10_code, trap_type").eq("chart_id", attempt.chart_id),
  ]);
  if (keyResult.error || distractorResult.error) return { error: "Could not load this chart's answer key." };
  const key = keyResult.data;
  const distractors = distractorResult.data;

  const submitted = [...codes.keys()];
  const info = await lookupCodes(db, chart.payment_year, [...submitted, ...key.map((k) => k.icd10_code)]);
  const invalid = submitted.filter((code) => !info.get(code)?.isBillable);
  if (invalid.length > 0) {
    return { error: `Not billable ICD-10-CM codes for PY${chart.payment_year}: ${invalid.join(", ")}. Remove them and resubmit.` };
  }

  const reference = buildReferenceSlice(await loadHierarchy(db, chart.payment_year), mappingsFor(info));
  const patient = { age: ageOn(chart.patient_dob, chart.encounter_date), sex: chart.patient_sex };
  const score = scoreAttempt({
    submitted,
    key: key.map((k) => ({ code: k.icd10_code, required: k.is_required })),
    patient,
    reference,
  });
  const review = reviewCodes(
    submitted,
    key.map((k) => ({ code: k.icd10_code, required: k.is_required, trap: k.trap_type })),
    distractors.map((d) => ({ code: d.icd10_code, trap: d.trap_type })),
  );
  const breakdown = makeBreakdown({ paymentYear: chart.payment_year, patient, score, review });
  const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;
  const hcc = (n: number) => `HCC${n}`;

  const { error } = await service.rpc("submit_scored_attempt", {
    p_attempt_id: attemptId,
    p_user_id: user.id,
    // Validated again in SQL against pg_timezone_names; unknown zones fall back to UTC.
    p_timezone: parsed.data.timezone,
    p_codes: submitted.map((code) => ({
      icd10_code: code,
      supporting_excerpt: codes.get(code)!.excerpt,
      user_rationale: codes.get(code)!.rationale,
    })),
    p_result: {
      captured: score.captured.map(hcc),
      missed: score.missed.map(hcc),
      over_coded: score.overCoded.map(hcc),
      precision: round(score.precision, 4),
      recall: round(score.recall, 4),
      raf_user: score.user.raf,
      raf_key: score.key.raf,
      raf_delta: score.rafDelta,
      score_pct: score.scorePct,
      // A plain JSON copy: every field is a string, number, boolean, array or object.
      breakdown: JSON.parse(JSON.stringify(breakdown)) as Json,
    },
  });
  if (error) return { error: "Could not save your attempt. Try again." };

  revalidatePath("/practice");
  redirect(`/practice/${attempt.chart_id}/result/${attemptId}`);
}

import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { DIFFICULTY_LABELS, SPECIALTIES } from "@/lib/charts/constants";
import { canOpenChart } from "@/lib/billing/access";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Practice charts" };

const filterSchema = z.object({
  specialty: z.enum(SPECIALTIES).optional().catch(undefined),
  difficulty: z.coerce.number().int().min(1).max(3).optional().catch(undefined),
  year: z.coerce.number().int().min(2020).max(2100).optional().catch(undefined),
  unattempted: z.literal("1").optional().catch(undefined),
});

/**
 * Published charts, filtered, with this learner's best and latest score per
 * chart. Reads through the learner's own session, so RLS decides what is
 * visible and whose attempts are counted.
 */
export default async function PracticePage({ searchParams }: PageProps<"/practice">) {
  const user = await requireUser("/practice");
  const filters = filterSchema.parse(await searchParams);
  const supabase = await createClient();

  let query = supabase
    .from("charts")
    .select("id, title, specialty, difficulty, payment_year")
    .eq("status", "published")
    .order("difficulty")
    .order("title");
  if (filters.specialty) query = query.eq("specialty", filters.specialty);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters.year) query = query.eq("payment_year", filters.year);

  const [{ data: charts, error }, { data: attempts }, { data: years }, { data: entitlement }] = await Promise.all([
    query,
    supabase
      .from("attempts")
      .select("chart_id, submitted_at, attempt_results(score_pct)")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false }),
    supabase.from("payment_years").select("year").eq("is_active", true).order("year", { ascending: false }),
    supabase.rpc("my_entitlement"),
  ]);
  // The paywall is enforced in Postgres (chart_access); this only labels the list.
  const ent = entitlement?.[0] ?? { full_access: false, free_used: 0, free_limit: 5 };
  const started = new Set((attempts ?? []).map((a) => a.chart_id));
  const locked = (chartId: string) => !canOpenChart({ fullAccess: ent.full_access, startedChartIds: started, chartId });
  if (error) throw new Error(error.message);

  const history = new Map<string, { best: number | null; last: number | null; inProgress: boolean }>();
  for (const a of attempts ?? []) {
    const entry = history.get(a.chart_id) ?? { best: null, last: null, inProgress: false };
    if (!a.submitted_at) entry.inProgress = true;
    const score = a.attempt_results ? Number(a.attempt_results.score_pct) : null;
    if (score !== null) {
      if (entry.last === null) entry.last = score;
      entry.best = entry.best === null ? score : Math.max(entry.best, score);
    }
    history.set(a.chart_id, entry);
  }

  const visible = (charts ?? []).filter((c) => !filters.unattempted || !history.get(c.id)?.last);

  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader user={user} />
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="m-0 text-xl font-semibold">Practice charts</h1>
          <p className="m-0 mt-1 text-[13px] text-muted">
            Synthetic progress notes. Every patient, provider and facility is invented.
          </p>
        </div>

        {!ent.full_access ? (
          <p className="m-0 flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface px-4 py-3 text-[13px]">
            <span>
              Free plan: <b>{Math.min(ent.free_used, ent.free_limit)} of {ent.free_limit}</b> free charts used
              {ent.free_used >= ent.free_limit ? ". Charts you have started stay open." : "."}
            </span>
            <Link href="/billing" className="font-medium text-accent-ink hover:underline">
              Unlock the full library →
            </Link>
          </p>
        ) : null}

        <form className="flex flex-wrap items-end gap-3 text-[13px]" method="get">
          <label className="flex flex-col gap-1">
            Specialty
            <select name="specialty" defaultValue={filters.specialty ?? ""} className="h-9 rounded-[6px] border border-border bg-surface px-2">
              <option value="">All</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Difficulty
            <select name="difficulty" defaultValue={filters.difficulty ?? ""} className="h-9 rounded-[6px] border border-border bg-surface px-2">
              <option value="">All</option>
              {([1, 2, 3] as const).map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Payment year
            <select name="year" defaultValue={filters.year ?? ""} className="h-9 rounded-[6px] border border-border bg-surface px-2">
              <option value="">All</option>
              {(years ?? []).map((y) => (
                <option key={y.year} value={y.year}>
                  PY{y.year}
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-9 items-center gap-2">
            <input type="checkbox" name="unattempted" value="1" defaultChecked={Boolean(filters.unattempted)} className="accent-accent" />
            Not yet scored
          </label>
          <button type="submit" className="h-9 cursor-pointer rounded-[6px] bg-accent px-4 font-medium text-white">
            Filter
          </button>
          <Link href="/practice" className="h-9 leading-9 text-muted hover:text-ink">
            Clear
          </Link>
        </form>

        <Table>
          <thead>
            <tr>
              <TableHead>Chart</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Best</TableHead>
              <TableHead>Last</TableHead>
            </tr>
          </thead>
          <tbody>
            {visible.map((chart) => {
              const h = history.get(chart.id);
              return (
                <tr key={chart.id}>
                  <TableCell className="font-medium">
                    {locked(chart.id) ? (
                      <span className="text-ink/70">
                        {chart.title}{" "}
                        <Link href="/billing" className="ml-1 text-[12px] font-normal text-accent-ink hover:underline">
                          Locked · subscribe
                        </Link>
                      </span>
                    ) : (
                      <Link href={`/practice/${chart.id}`} className="text-accent-ink hover:underline">
                        {chart.title}
                      </Link>
                    )}
                    {h?.inProgress ? <span className="ml-2 text-[12px] text-muted">draft in progress</span> : null}
                  </TableCell>
                  <TableCell>{chart.specialty}</TableCell>
                  <TableCell>{DIFFICULTY_LABELS[chart.difficulty as 1 | 2 | 3] ?? chart.difficulty}</TableCell>
                  <TableCell>PY{chart.payment_year}</TableCell>
                  <TableCell className="font-mono">{h?.best != null ? `${h.best.toFixed(0)}%` : "—"}</TableCell>
                  <TableCell className="font-mono">{h?.last != null ? `${h.last.toFixed(0)}%` : "—"}</TableCell>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <TableCell colSpan={6} className="text-muted">
                  {charts?.length ? "No charts match these filters." : "No charts are published yet."}
                </TableCell>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { DIFFICULTY_LABELS } from "@/lib/charts/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Practice charts" };

/**
 * Phase 1: the published chart list only (no filters, no encoder yet). Reads
 * through the learner's own session, so RLS decides what is visible.
 */
export default async function PracticePage() {
  const user = await requireUser("/practice");
  const supabase = await createClient();
  const { data: charts, error } = await supabase
    .from("charts")
    .select("id, title, specialty, difficulty, payment_year")
    .eq("status", "published")
    .order("difficulty")
    .order("title");
  if (error) throw new Error(error.message);

  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader user={user} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="m-0 text-xl font-semibold">Practice charts</h1>
          <p className="m-0 mt-1 text-[13px] text-muted">Synthetic progress notes. Every patient, provider and facility is invented.</p>
        </div>
        <Table>
          <thead>
            <tr>
              <TableHead>Chart</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Payment year</TableHead>
            </tr>
          </thead>
          <tbody>
            {(charts ?? []).map((chart) => (
              <tr key={chart.id}>
                <TableCell className="font-medium">{chart.title}</TableCell>
                <TableCell>{chart.specialty}</TableCell>
                <TableCell>{DIFFICULTY_LABELS[chart.difficulty as 1 | 2 | 3] ?? chart.difficulty}</TableCell>
                <TableCell>PY{chart.payment_year}</TableCell>
              </tr>
            ))}
            {charts?.length === 0 ? (
              <tr>
                <TableCell colSpan={4} className="text-muted">
                  No charts are published yet.
                </TableCell>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </main>
    </div>
  );
}

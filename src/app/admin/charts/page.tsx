import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Charts · Admin" };

export default async function AdminChartsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: charts, error } = await supabase
    .from("charts")
    .select("id, title, specialty, difficulty, payment_year, encounter_date, status, updated_at, answer_key_items(count), distractors(count)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 text-xl font-semibold">Charts</h1>
          <p className="m-0 mt-1 text-[13px] text-muted">Synthetic charts and their answer keys. Learners see published charts only.</p>
        </div>
        <Button asChild>
          <Link href="/admin/charts/new">New chart</Link>
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <TableHead>Title</TableHead>
            <TableHead>Specialty</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Key codes</TableHead>
            <TableHead>Distractors</TableHead>
            <TableHead>Status</TableHead>
          </tr>
        </thead>
        <tbody>
          {(charts ?? []).map((chart) => (
            <tr key={chart.id}>
              <TableCell>
                <Link href={`/admin/charts/${chart.id}`} className="font-medium text-accent-ink">
                  {chart.title}
                </Link>
              </TableCell>
              <TableCell>{chart.specialty}</TableCell>
              <TableCell>{chart.difficulty}</TableCell>
              <TableCell>PY{chart.payment_year}</TableCell>
              <TableCell>{chart.answer_key_items[0]?.count ?? 0}</TableCell>
              <TableCell>{chart.distractors[0]?.count ?? 0}</TableCell>
              <TableCell>
                <Badge variant={chart.status === "published" ? "default" : "neutral"}>{chart.status}</Badge>
              </TableCell>
            </tr>
          ))}
          {charts?.length === 0 ? (
            <tr>
              <TableCell colSpan={7} className="text-muted">
                No charts yet.
              </TableCell>
            </tr>
          ) : null}
        </tbody>
      </Table>
    </div>
  );
}

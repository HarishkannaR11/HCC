import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { DIFFICULTY_LABELS } from "@/lib/charts/constants";
import { createChart } from "./actions";

export default async function AdminChartsPage() {
  await requireAdmin();
  const db = await createClient();

  const { data: charts, error } = await db
    .from("charts")
    .select("id, title, specialty, difficulty, payment_year, status, updated_at, answer_key_items(count)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Charts</h1>
          <p className="text-[13px] text-muted">
            Drafts are visible only to admins. Publish a chart once its answer key has been reviewed.
          </p>
        </div>
        <form action={createChart}>
          <Button type="submit">New chart</Button>
        </form>
      </div>

      <Card>
        {charts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            No charts yet. Create one, or run <code className="font-mono">npm run seed:charts</code>.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>PY</TableHead>
                <TableHead>Key codes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charts.map((chart) => (
                <TableRow key={chart.id}>
                  <TableCell>
                    <Link href={`/admin/charts/${chart.id}`} className="font-medium text-accent hover:underline">
                      {chart.title}
                    </Link>
                  </TableCell>
                  <TableCell>{chart.specialty}</TableCell>
                  <TableCell>{DIFFICULTY_LABELS[chart.difficulty]}</TableCell>
                  <TableCell className="font-mono">{chart.payment_year}</TableCell>
                  <TableCell className="font-mono">{chart.answer_key_items[0]?.count ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={chart.status === "published" ? "default" : "outline"}>{chart.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

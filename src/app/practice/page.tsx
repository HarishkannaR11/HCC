import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { DIFFICULTY_LABELS } from "@/lib/charts/constants";

export const metadata = { title: "Practice · Chartwise" };

export default async function PracticePage() {
  const user = await requireUser("/practice");
  const db = await createClient();

  // Columns are listed explicitly: this page never selects anything a learner
  // should not see, and RLS limits the rows to published charts. Admins see
  // only published charts here too, so this page shows what learners see.
  const { data: charts, error } = await db
    .from("charts")
    .select("id, title, specialty, difficulty, payment_year")
    .eq("status", "published")
    .order("difficulty")
    .order("title");
  if (error) throw new Error(error.message);

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">Practice charts</h1>
          <p className="text-[13px] text-muted">
            Read the note, assign ICD-10-CM codes, and see which HCCs you captured. The coding screen opens from here
            in the next build.
          </p>
        </div>
        {charts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted">No charts are published yet.</CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {charts.map((chart) => (
              <li key={chart.id}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <h2 className="font-medium">{chart.title}</h2>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      <Badge variant="outline">{chart.specialty}</Badge>
                      <Badge variant="outline">{DIFFICULTY_LABELS[chart.difficulty]}</Badge>
                      <Badge variant="outline">PY{chart.payment_year}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

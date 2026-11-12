import type { Metadata } from "next";
import Link from "next/link";
import { ChartMetaForm } from "@/components/admin/chart-meta-form";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New chart · Admin" };

export default async function NewChartPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: years } = await supabase.from("payment_years").select("year").eq("is_active", true).order("year", { ascending: false });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link href="/admin/charts" className="text-[13px] text-accent-ink">
          ← Charts
        </Link>
        <h1 className="m-0 mt-2 text-xl font-semibold">New chart</h1>
        <p className="m-0 mt-1 text-[13px] text-muted">Create the draft first; add the chart text and answer key next.</p>
      </div>
      {years && years.length > 0 ? (
        <ChartMetaForm years={years.map((y) => y.year)} />
      ) : (
        <p className="text-[13px] text-destructive">No active payment year. Load reference data first (npm run db:seed).</p>
      )}
    </div>
  );
}

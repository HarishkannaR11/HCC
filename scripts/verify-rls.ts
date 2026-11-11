/**
 * RLS verification: tries to read the answer key as a learner and as an
 * anonymous visitor, by every route the Data API offers, against a real
 * Supabase project. Verifies the policies by attacking them, not by reading them.
 *
 *   npm run verify:rls
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, the publishable/anon key and the service-role
 * key (in .env.local). Creates two throwaway users and two charts, and deletes
 * all of it at the end. Run it against dev, never against prod.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { loadEnv, supabaseConfig } from "./lib/env";

type Db = SupabaseClient<Database>;

let failures = 0;
function check(description: string, ok: boolean, detail?: unknown): void {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${description}`);
  if (!ok && detail !== undefined) console.log(`        got ${JSON.stringify(detail)}`);
}

/** "No rows" and "permission denied" both mean the read failed — which is the point. */
function nothingCameBack(result: { data: unknown; error: unknown }): boolean {
  if (result.error) return true;
  return Array.isArray(result.data) ? result.data.length === 0 : result.data === null;
}

function publishableKey(): string {
  loadEnv();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is not set");
  return key;
}

async function makeUser(service: Db, url: string, anonKey: string, label: string) {
  const email = `rls-${label}-${randomUUID().slice(0, 8)}@example.com`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Creating ${label} failed: ${error?.message}`);

  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Signing in ${label} failed: ${signInError.message}`);
  return { id: data.user.id, client };
}

async function main(): Promise<void> {
  const { url, key: serviceKey } = supabaseConfig();
  const anonKey = publishableKey();
  const service = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log(`Attacking the answer key on ${url}\n`);

  // --- fixtures -------------------------------------------------------------
  const { data: year } = await service.from("payment_years").select("year").eq("is_active", true).limit(1).maybeSingle();
  if (!year) throw new Error("No active payment year — load reference data first.");
  const { data: codes } = await service
    .from("icd10_codes")
    .select("code")
    .eq("payment_year", year.year)
    .eq("is_billable", true)
    .limit(2);
  if (!codes || codes.length < 2) throw new Error("Need at least two billable codes loaded.");
  const [keyCode, distractorCode] = codes.map((c) => c.code);

  const learner = await makeUser(service, url, anonKey, "learner");
  const other = await makeUser(service, url, anonKey, "other");
  const admin = await makeUser(service, url, anonKey, "admin");
  await service.from("profiles").update({ role: "admin" }).eq("id", admin.id);

  const chartIds: string[] = [];
  try {
    // --- admin can author through RLS ----------------------------------------
    console.log("Admin authoring through RLS");
    const chartRow = (title: string) => ({
      title,
      specialty: "Internal Medicine",
      difficulty: 1,
      payment_year: year.year,
      encounter_date: `${year.year - 1}-06-15`,
      patient_name: "RLS Probe Patient",
      patient_dob: "1950-01-01",
      patient_sex: "female" as const,
      patient_mrn: "SYN-000000",
      provider_name: "RLS Probe, MD",
      facility_name: "RLS Probe Clinic",
      is_synthetic: true,
    });

    const published = await admin.client.from("charts").insert(chartRow("RLS probe (published)")).select("id").single();
    const draft = await admin.client.from("charts").insert(chartRow("RLS probe (draft)")).select("id").single();
    check("admin creates charts", !published.error && !draft.error, published.error ?? draft.error);
    if (!published.data || !draft.data) throw new Error("Cannot continue without charts");
    chartIds.push(published.data.id, draft.data.id);
    const pub = published.data.id;
    const drf = draft.data.id;

    for (const chartId of [pub, drf]) {
      const s = await admin.client
        .from("chart_sections")
        .insert({ chart_id: chartId, section_type: "assessment_plan", content: "RLS probe text.", sort_order: 0 });
      const k = await admin.client.from("answer_key_items").insert({
        chart_id: chartId,
        icd10_code: keyCode,
        supporting_excerpt: "SECRET-EXCERPT",
        rationale: "SECRET-RATIONALE",
      });
      const d = await admin.client
        .from("distractors")
        .insert({ chart_id: chartId, icd10_code: distractorCode, why_wrong: "SECRET-WHY-WRONG" });
      check(`admin writes section, answer key and distractor (${chartId === pub ? "published" : "draft"})`, !s.error && !k.error && !d.error, s.error ?? k.error ?? d.error);
    }
    const pubUpdate = await admin.client.from("charts").update({ status: "published" }).eq("id", pub);
    check("admin publishes a chart", !pubUpdate.error, pubUpdate.error);

    const forged = await admin.client.from("charts").insert({ ...chartRow("not synthetic"), is_synthetic: false });
    check("is_synthetic = false is rejected by the CHECK", forged.error !== null);
    const badCode = await admin.client.from("answer_key_items").insert({ chart_id: drf, icd10_code: "ZZZ.999" });
    check("a code outside the payment year's code set is rejected", badCode.error !== null);

    // --- learner: charts ------------------------------------------------------
    console.log("\nLearner: chart list");
    const list = await learner.client.from("charts").select("id, status");
    const ids = (list.data ?? []).map((c) => c.id);
    check("sees the published chart", ids.includes(pub), list.error ?? list.data);
    check("does not see the draft chart", !ids.includes(drf));
    check("sees only published charts", (list.data ?? []).every((c) => c.status === "published"));
    check("reads published chart text", !nothingCameBack(await learner.client.from("chart_sections").select("id").eq("chart_id", pub)));
    check("cannot read draft chart text", nothingCameBack(await learner.client.from("chart_sections").select("id").eq("chart_id", drf)));

    // --- learner: every way at the answer key ---------------------------------
    console.log("\nLearner: answer key and distractors");
    check("select * from answer_key_items", nothingCameBack(await learner.client.from("answer_key_items").select("*")));
    check("select * from distractors", nothingCameBack(await learner.client.from("distractors").select("*")));
    check(
      "answer_key_items filtered to the published chart",
      nothingCameBack(await learner.client.from("answer_key_items").select("*").eq("chart_id", pub)),
    );

    const embedded = await learner.client
      .from("charts")
      .select("id, answer_key_items(*), distractors(*)")
      .eq("id", pub)
      .maybeSingle();
    const leaked = embedded.data
      ? JSON.stringify(embedded.data).includes("SECRET")
      : false;
    check("embedding answer_key_items / distractors in a chart read", !leaked, embedded.data);

    const counted = await learner.client.from("answer_key_items").select("*", { count: "exact", head: true });
    check("row count of answer_key_items is 0", (counted.count ?? 0) === 0, counted.count);

    const ins = await learner.client.from("answer_key_items").insert({ chart_id: pub, icd10_code: distractorCode });
    check("cannot insert into answer_key_items", ins.error !== null);
    const upd = await learner.client.from("answer_key_items").update({ rationale: "x" }).eq("chart_id", pub).select("id");
    check("cannot update answer_key_items", nothingCameBack(upd));
    const del = await learner.client.from("distractors").delete().eq("chart_id", pub).select("id");
    check("cannot delete distractors", nothingCameBack(del));
    const chartIns = await learner.client.from("charts").insert(chartRow("learner chart"));
    check("cannot create charts", chartIns.error !== null);
    const chartUpd = await learner.client.from("charts").update({ status: "draft" }).eq("id", pub).select("id");
    check("cannot unpublish (update) charts", nothingCameBack(chartUpd));

    // --- the one door: get_attempt_answer_key ---------------------------------
    console.log("\nLearner: the post-submission gate");
    const rpcRandom = await learner.client.rpc("get_attempt_answer_key", { p_attempt_id: randomUUID() });
    check("RPC with an unknown attempt returns nothing", nothingCameBack(rpcRandom), rpcRandom.data);

    const forgedAttempt = await learner.client
      .from("attempts")
      .insert({ user_id: learner.id, chart_id: pub, submitted_at: new Date().toISOString() });
    check("cannot insert an attempt directly (no forged submissions)", forgedAttempt.error !== null);

    // Both timestamps from one clock: the DB's now() and this machine's can disagree.
    const startedAt = new Date(Date.now() - 60_000).toISOString();
    const submittedAt = new Date().toISOString();
    const mine = await service
      .from("attempts")
      .insert({ user_id: learner.id, chart_id: pub, started_at: startedAt })
      .select("id")
      .single();
    const theirs = await service
      .from("attempts")
      .insert({ user_id: other.id, chart_id: pub, started_at: startedAt, submitted_at: submittedAt })
      .select("id")
      .single();
    if (!mine.data || !theirs.data) {
      throw new Error(`Could not create probe attempts: ${(mine.error ?? theirs.error)?.message}`);
    }

    check(
      "RPC on own UNSUBMITTED attempt returns nothing",
      nothingCameBack(await learner.client.rpc("get_attempt_answer_key", { p_attempt_id: mine.data.id })),
    );
    check(
      "distractor RPC on own unsubmitted attempt returns nothing",
      nothingCameBack(await learner.client.rpc("get_attempt_distractors", { p_attempt_id: mine.data.id })),
    );
    check(
      "RPC on ANOTHER learner's submitted attempt returns nothing",
      nothingCameBack(await learner.client.rpc("get_attempt_answer_key", { p_attempt_id: theirs.data.id })),
    );
    const selfSubmit = await learner.client
      .from("attempts")
      .update({ submitted_at: new Date().toISOString() })
      .eq("id", mine.data.id)
      .select("id");
    check("cannot mark own attempt submitted", nothingCameBack(selfSubmit));
    check(
      "gate still closed after that update attempt",
      nothingCameBack(await learner.client.rpc("get_attempt_answer_key", { p_attempt_id: mine.data.id })),
    );
    const forgedScore = await learner.client.from("attempt_results").insert({
      attempt_id: mine.data.id,
      captured: 9,
      missed: 0,
      over_coded: 0,
      precision: 1,
      recall: 1,
      raf_user: 9,
      raf_key: 9,
      raf_delta: 0,
      score_pct: 100,
    });
    check("cannot write own score", forgedScore.error !== null);
    check("reads own attempt", !nothingCameBack(await learner.client.from("attempts").select("id").eq("id", mine.data.id)));
    check("cannot read another learner's attempt", nothingCameBack(await learner.client.from("attempts").select("id").eq("id", theirs.data.id)));

    // Server-side submission (what the Phase 2 submit action will do) opens the gate.
    await service.from("attempts").update({ submitted_at: submittedAt }).eq("id", mine.data.id);
    const opened = await learner.client.rpc("get_attempt_answer_key", { p_attempt_id: mine.data.id });
    check("after a server-side submit, the learner gets that chart's key", (opened.data ?? []).length === 1, opened.error ?? opened.data);
    const openedDistractors = await learner.client.rpc("get_attempt_distractors", { p_attempt_id: mine.data.id });
    check("…and its distractors", (openedDistractors.data ?? []).length === 1, openedDistractors.error ?? openedDistractors.data);
    check("…and the tables themselves stay closed", nothingCameBack(await learner.client.from("answer_key_items").select("*")));

    // --- learner: own profile ---------------------------------------------------
    console.log("\nLearner: profile and role");
    const roleUp = await learner.client.from("profiles").update({ role: "admin" }).eq("id", learner.id);
    check("cannot promote self to admin", roleUp.error !== null);
    const { data: stillLearner } = await service.from("profiles").select("role").eq("id", learner.id).single();
    check("role is still learner", stillLearner?.role === "learner", stillLearner);
    const nameUp = await learner.client.from("profiles").update({ full_name: "Renamed Learner" }).eq("id", learner.id).select("id");
    check("can rename self", !nameUp.error && (nameUp.data ?? []).length === 1, nameUp.error);
    check("cannot read another profile", nothingCameBack(await learner.client.from("profiles").select("id").eq("id", other.id)));
    const isAdmin = await learner.client.rpc("is_admin");
    check("is_admin() is false", isAdmin.data === false, isAdmin.data);

    // --- anonymous --------------------------------------------------------------
    console.log("\nAnonymous visitor");
    check("cannot list charts", nothingCameBack(await anon.from("charts").select("id")));
    check("cannot read answer_key_items", nothingCameBack(await anon.from("answer_key_items").select("*")));
    check("cannot read distractors", nothingCameBack(await anon.from("distractors").select("*")));
    check("cannot call the answer-key RPC", nothingCameBack(await anon.rpc("get_attempt_answer_key", { p_attempt_id: mine.data.id })));
    check("can read public reference data", !nothingCameBack(await anon.from("hcc_categories").select("id").limit(1)));
  } finally {
    for (const id of chartIds) await service.from("charts").delete().eq("id", id);
    for (const u of [learner, other, admin]) await service.auth.admin.deleteUser(u.id);
  }

  console.log(failures === 0 ? "\nAll RLS checks passed." : `\n${failures} RLS check(s) FAILED.`);
  if (failures > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error("\n" + (error instanceof Error ? (error.stack ?? error.message) : String(error)));
  process.exit(1);
});

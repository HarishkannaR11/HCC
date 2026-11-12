/**
 * Row Level Security, end to end.
 *
 * The Phase 1 acceptance test: an admin can build a chart with an answer key,
 * and a learner can see published charts but cannot read a single answer key
 * or distractor row by any API path: direct select, filters, counts,
 * resource embedding, GraphQL, writes, or role escalation.
 *
 * Runs against the local stack through the same public endpoints a browser
 * uses. Creates its own users and charts and removes them afterwards.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { databaseUrl, supabaseEnv } from "../../scripts/lib/env";
import type { Database } from "../../src/lib/supabase/database.types";

type Api = SupabaseClient<Database>;

const env = supabaseEnv();
const run = randomUUID().slice(0, 8);
const password = `pw-${randomUUID()}`;

const service: Api = createClient<Database>(env.url, env.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon: Api = createClient<Database>(env.url, env.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const users: Record<"admin" | "learner" | "otherLearner" | "sneaky", { id: string; email: string; client: Api; token: string }> =
  {} as never;
let publishedChartId = "";
let draftChartId = "";

async function makeUser(label: keyof typeof users, metadata: Record<string, unknown> = {}) {
  const email = `rls-${label.toLowerCase()}-${run}@example.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `RLS ${label}`, ...metadata },
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");

  const client = createClient<Database>(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: session, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError || !session.session) throw signInError ?? new Error("no session");
  users[label] = { id: data.user.id, email, client, token: session.session.access_token };
}

async function graphql(token: string, query: string) {
  const response = await fetch(`${env.url}/graphql/v1`, {
    method: "POST",
    headers: { apikey: env.anonKey, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return response.json() as Promise<{ data?: Record<string, { edges: unknown[] } | null>; errors?: unknown[] }>;
}

const chartFields = (title: string) => ({
  title,
  specialty: "Family Medicine",
  difficulty: 1,
  payment_year: 2026,
  encounter_date: "2025-06-10",
  patient_name: "Test Patient",
  patient_dob: "1950-01-01",
  patient_sex: "female" as const,
  patient_mrn: `SYN-RLS${run.toUpperCase()}`,
  provider_name: "Test Provider, MD",
  facility_name: "Test Clinic",
});

beforeAll(async () => {
  await makeUser("admin");
  await makeUser("learner");
  await makeUser("otherLearner");
  // Tries to self-assign admin through signup metadata.
  await makeUser("sneaky", { role: "admin" });

  const { error } = await service.from("profiles").update({ role: "admin" }).eq("id", users.admin.id);
  if (error) throw error;
  const reference = await service.from("payment_years").select("year").eq("year", 2026).maybeSingle();
  if (!reference.data) throw new Error("PY2026 reference data is not loaded. Run: npm run db:seed:fixture");
});

afterAll(async () => {
  for (const id of [publishedChartId, draftChartId].filter(Boolean)) {
    await service.from("attempts").delete().eq("chart_id", id);
    await service.from("charts").delete().eq("id", id);
  }
  for (const user of Object.values(users)) await service.auth.admin.deleteUser(user.id);
});

describe("schema", () => {
  it("has RLS enabled on every table in the public schema", async () => {
    const db = new Client({ connectionString: databaseUrl() });
    await db.connect();
    try {
      const { rows } = await db.query<{ table: string; rls: boolean }>(
        `select c.relname as table, c.relrowsecurity as rls
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r', 'p')
         order by 1`,
      );
      // An exact list: a new table must be added here, deliberately.
      expect(rows.map((r) => r.table)).toEqual([
        "answer_key_items",
        "attempt_codes",
        "attempt_results",
        "attempts",
        "billing_events",
        "chart_sections",
        "charts",
        "daily_activity",
        "distractors",
        "hcc_categories",
        "hcc_hierarchy",
        "icd10_codes",
        "icd_hcc_map",
        "payment_years",
        "profiles",
        "subscriptions",
      ]);
      expect(rows.filter((r) => !r.rls).map((r) => r.table)).toEqual([]);
    } finally {
      await db.end();
    }
  });

  it("exposes no views or functions that could bypass RLS on the key", async () => {
    const db = new Client({ connectionString: databaseUrl() });
    await db.connect();
    try {
      const views = await db.query("select table_name from information_schema.views where table_schema = 'public'");
      expect(views.rows).toEqual([]);
      // SECURITY DEFINER functions callable by API roles: only these audited ones.
      //   chart_access(chart): "may I open this chart?" from the caller's own
      //     attempts and subscription; never touches keys or distractors.
      //   my_entitlement(): the caller's own access flag and free-chart count.
      // has_full_access(user) can look at anyone and is NOT callable by API roles.
      const definers = await db.query<{ name: string }>(
        `select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prosecdef
           and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))
         order by 1`,
      );
      expect(definers.rows.map((r) => r.name)).toEqual(["chart_access", "handle_new_user", "is_admin", "my_entitlement"]);
    } finally {
      await db.end();
    }
  });
});

describe("profiles and roles", () => {
  it("creates a learner profile for every new user, ignoring a role in signup metadata", async () => {
    const { data } = await service.from("profiles").select("id, role, full_name").in("id", [users.learner.id, users.sneaky.id]);
    expect(data?.map((p) => p.role)).toEqual(["learner", "learner"]);
    expect(data?.find((p) => p.id === users.learner.id)?.full_name).toBe("RLS learner");
  });

  it("lets a learner rename themselves but not change their role", async () => {
    const rename = await users.learner.client.from("profiles").update({ full_name: "Renamed" }).eq("id", users.learner.id);
    expect(rename.error).toBeNull();

    const escalate = await users.learner.client.from("profiles").update({ role: "admin" }).eq("id", users.learner.id);
    expect(escalate.error?.code).toBe("42501");
    const { data } = await service.from("profiles").select("role").eq("id", users.learner.id).single();
    expect(data?.role).toBe("learner");
  });

  it("hides other users' profiles from a learner", async () => {
    const { data } = await users.learner.client.from("profiles").select("id");
    expect(data?.map((p) => p.id)).toEqual([users.learner.id]);
  });

  it("reports is_admin() truthfully", async () => {
    expect((await users.learner.client.rpc("is_admin")).data).toBe(false);
    expect((await users.admin.client.rpc("is_admin")).data).toBe(true);
  });
});

describe("admin authoring", () => {
  it("creates a published chart with sections, an answer key and a distractor", async () => {
    const admin = users.admin.client;
    const chart = await admin.from("charts").insert(chartFields(`RLS published ${run}`)).select("id").single();
    expect(chart.error).toBeNull();
    publishedChartId = chart.data!.id;

    const sections = await admin.from("chart_sections").insert([
      { chart_id: publishedChartId, section_type: "hpi", content: "Type 2 diabetes with diabetic CKD stage 3a.", sort_order: 0 },
      { chart_id: publishedChartId, section_type: "assessment_plan", content: "1. Type 2 diabetes with diabetic CKD, stage 3a.", sort_order: 5 },
    ]);
    expect(sections.error).toBeNull();

    const key = await admin.from("answer_key_items").insert([
      { chart_id: publishedChartId, icd10_code: "E11.22", is_required: true, supporting_excerpt: "diabetic CKD", rationale: "SECRET-RATIONALE", trap_type: "none" },
      { chart_id: publishedChartId, icd10_code: "n18.31", is_required: true, trap_type: "unspecified_when_specific_exists" },
    ]);
    expect(key.error).toBeNull();

    const distractor = await admin
      .from("distractors")
      .insert({ chart_id: publishedChartId, icd10_code: "E11.9", why_wrong: "SECRET-DISTRACTOR", trap_type: "unspecified_when_specific_exists" });
    expect(distractor.error).toBeNull();

    const publish = await admin.from("charts").update({ status: "published" }).eq("id", publishedChartId);
    expect(publish.error).toBeNull();

    const { data: items } = await admin.from("answer_key_items").select("icd10_code").eq("chart_id", publishedChartId).order("icd10_code");
    // Codes are normalised to the dotted canonical form by the trigger.
    expect(items?.map((i) => i.icd10_code)).toEqual(["E11.22", "N18.31"]);
  });

  it("keeps a second chart in draft", async () => {
    const draft = await users.admin.client.from("charts").insert(chartFields(`RLS draft ${run}`)).select("id").single();
    expect(draft.error).toBeNull();
    draftChartId = draft.data!.id;
    await users.admin.client.from("chart_sections").insert({
      chart_id: draftChartId,
      section_type: "assessment_plan",
      content: "DRAFT-ONLY TEXT",
      sort_order: 5,
    });
  });

  it("refuses to publish a chart with no required answer key code", async () => {
    const result = await users.admin.client.from("charts").update({ status: "published" }).eq("id", draftChartId);
    expect(result.error?.message).toMatch(/required answer key code/);
  });

  it("enforces synthetic charts at the database", async () => {
    const notSynthetic = await users.admin.client.from("charts").insert({ ...chartFields("Not synthetic"), is_synthetic: false });
    expect(notSynthetic.error?.message).toMatch(/charts_must_be_synthetic/);

    const realLookingMrn = await users.admin.client.from("charts").insert({ ...chartFields("Real MRN"), patient_mrn: "00482913" });
    expect(realLookingMrn.error?.message).toMatch(/charts_synthetic_mrn/);
  });

  it("rejects codes that are not billable PY2026 codes, and a code that is both right and wrong", async () => {
    const admin = users.admin.client;
    const unknown = await admin.from("answer_key_items").insert({ chart_id: draftChartId, icd10_code: "E11.99" });
    expect(unknown.error?.message).toMatch(/not an ICD-10-CM code in payment year 2026/);

    const header = await admin.from("answer_key_items").insert({ chart_id: draftChartId, icd10_code: "E11" });
    expect(header.error?.message).toMatch(/category header/);

    const both = await admin.from("distractors").insert({ chart_id: publishedChartId, icd10_code: "E11.22", why_wrong: "x" });
    expect(both.error?.message).toMatch(/already on the answer key/);
  });
});

describe("a learner", () => {
  it("sees published charts and their sections, but not drafts", async () => {
    const learner = users.learner.client;
    const { data: charts } = await learner.from("charts").select("id, status");
    const ids = charts?.map((c) => c.id) ?? [];
    expect(ids).toContain(publishedChartId);
    expect(ids).not.toContain(draftChartId);
    expect(charts?.every((c) => c.status === "published")).toBe(true);

    const published = await learner.from("chart_sections").select("content").eq("chart_id", publishedChartId);
    expect(published.data?.length).toBe(2);
    const draft = await learner.from("chart_sections").select("content").eq("chart_id", draftChartId);
    expect(draft.data).toEqual([]);
  });

  it("cannot read a single answer key or distractor row by direct select, filter or count", async () => {
    const learner = users.learner.client;
    expect((await learner.from("answer_key_items").select("*")).data).toEqual([]);
    expect((await learner.from("answer_key_items").select("*").eq("chart_id", publishedChartId)).data).toEqual([]);
    expect((await learner.from("answer_key_items").select("*").eq("icd10_code", "E11.22")).data).toEqual([]);
    expect((await learner.from("answer_key_items").select("*", { count: "exact", head: true })).count).toBe(0);
    expect((await learner.from("distractors").select("*")).data).toEqual([]);
    expect((await learner.from("distractors").select("*", { count: "exact", head: true })).count).toBe(0);
  });

  it("cannot reach the key through resource embedding", async () => {
    const { data, error } = await users.learner.client
      .from("charts")
      .select("id, answer_key_items(*), distractors(*)")
      .eq("id", publishedChartId)
      .single();
    expect(error).toBeNull();
    expect(data?.answer_key_items).toEqual([]);
    expect(data?.distractors).toEqual([]);

    const fromHcc = await users.learner.client.from("hcc_categories").select("hcc_code, answer_key_items(*)").eq("hcc_code", "HCC37");
    expect(fromHcc.data?.flatMap((h) => h.answer_key_items)).toEqual([]);
  });

  it("cannot reach the key through GraphQL", async () => {
    // pg_graphql is off in the local stack but can be on in a hosted project.
    // Turn it on for this test so the path is exercised, not skipped.
    const db = new Client({ connectionString: databaseUrl() });
    await db.connect();
    const before = await db.query("select 1 from pg_extension where extname = 'pg_graphql'");
    const enabledHere = before.rowCount === 0;
    if (enabledHere) await db.query("create extension pg_graphql");

    try {
      // Positive control: the endpoint is live and an admin does see the key.
      const asAdmin = await graphql(users.admin.token, "{ answer_key_itemsCollection { edges { node { icd10_code } } } }");
      expect(JSON.stringify(asAdmin)).toContain("E11.22");

      const result = await graphql(
        users.learner.token,
        "{ answer_key_itemsCollection { edges { node { icd10_code rationale } } } distractorsCollection { edges { node { why_wrong } } } }",
      );
      expect(result.errors).toBeUndefined();
      expect(result.data?.answer_key_itemsCollection?.edges).toEqual([]);
      expect(result.data?.distractorsCollection?.edges).toEqual([]);
      const text = JSON.stringify(result);
      expect(text).not.toContain("SECRET-RATIONALE");
      expect(text).not.toContain("SECRET-DISTRACTOR");

      const asAnon = await graphql(env.anonKey, "{ answer_key_itemsCollection { edges { node { icd10_code } } } }");
      expect(JSON.stringify(asAnon)).not.toContain("E11.22");
    } finally {
      if (enabledHere) await db.query("drop extension pg_graphql");
      await db.end();
    }
  });

  it("cannot write, change or delete the key", async () => {
    const learner = users.learner.client;
    const insert = await learner.from("answer_key_items").insert({ chart_id: publishedChartId, icd10_code: "E11.9" });
    expect(insert.error?.code).toBe("42501");

    await learner.from("answer_key_items").update({ rationale: "hacked" }).eq("chart_id", publishedChartId);
    await learner.from("answer_key_items").delete().eq("chart_id", publishedChartId);
    await learner.from("distractors").delete().eq("chart_id", publishedChartId);

    const key = await service.from("answer_key_items").select("rationale").eq("chart_id", publishedChartId);
    expect(key.data).toHaveLength(2);
    expect(key.data?.map((k) => k.rationale)).not.toContain("hacked");
    expect((await service.from("distractors").select("id").eq("chart_id", publishedChartId)).data).toHaveLength(1);
  });

  it("cannot write charts or sections", async () => {
    const learner = users.learner.client;
    expect((await learner.from("charts").insert(chartFields("Learner chart"))).error?.code).toBe("42501");
    await learner.from("charts").update({ title: "hacked" }).eq("id", publishedChartId);
    await learner.from("chart_sections").update({ content: "hacked" }).eq("chart_id", publishedChartId);
    const { data } = await service.from("charts").select("title").eq("id", publishedChartId).single();
    expect(data?.title).not.toBe("hacked");
  });

  it("can start an attempt on a published chart only, and sees only their own", async () => {
    const learner = users.learner.client;
    const started = await learner.from("attempts").insert({ chart_id: publishedChartId, user_id: users.learner.id }).select("id").single();
    expect(started.error).toBeNull();

    const onDraft = await learner.from("attempts").insert({ chart_id: draftChartId, user_id: users.learner.id });
    expect(onDraft.error?.code).toBe("42501");

    const asSomeoneElse = await learner.from("attempts").insert({ chart_id: publishedChartId, user_id: users.otherLearner.id });
    expect(asSomeoneElse.error?.code).toBe("42501");

    const others = await users.otherLearner.client.from("attempts").select("id");
    expect(others.data).toEqual([]);

    // Learners cannot submit or score themselves.
    const submit = await learner.from("attempts").update({ submitted_at: new Date().toISOString() }).eq("id", started.data!.id);
    expect(submit.error?.code).toBe("42501");
    const forged = await learner.from("attempt_results").insert({
      attempt_id: started.data!.id,
      precision: 1,
      recall: 1,
      raf_user: 1,
      raf_key: 1,
      raf_delta: 0,
      score_pct: 100,
    });
    expect(forged.error?.code).toBe("42501");
  });

  it("can edit codes on an open attempt but not after submission", async () => {
    const learner = users.learner.client;
    const { data: attempt } = await learner.from("attempts").select("id").eq("chart_id", publishedChartId).single();

    const add = await learner.from("attempt_codes").insert({ attempt_id: attempt!.id, icd10_code: "E11.9" });
    expect(add.error).toBeNull();
    const intrude = await users.otherLearner.client.from("attempt_codes").insert({ attempt_id: attempt!.id, icd10_code: "E11.22" });
    expect(intrude.error?.code).toBe("42501");

    await service.from("attempts").update({ submitted_at: new Date().toISOString() }).eq("id", attempt!.id);
    const late = await learner.from("attempt_codes").insert({ attempt_id: attempt!.id, icd10_code: "N18.31" });
    expect(late.error?.code).toBe("42501");
  });

  it("cannot read anyone's subscription or activity but their own", async () => {
    expect((await users.learner.client.from("subscriptions").select("*")).data).toEqual([]);
    expect((await users.learner.client.from("daily_activity").select("*")).data).toEqual([]);
    const write = await users.learner.client.from("subscriptions").insert({
      user_id: users.learner.id,
      provider: "paddle",
      provider_customer_id: "x",
      plan: "pro",
      status: "active",
    });
    expect(write.error?.code).toBe("42501");
  });
});

describe("the practice loop (Phase 2)", () => {
  let openAttemptId = "";

  it("lets a learner search codes, but not an anonymous visitor", async () => {
    const search = await users.learner.client.rpc("search_icd10_codes", { q: "e1122", p_payment_year: 2026 });
    expect(search.error).toBeNull();
    expect(search.data?.[0]?.code).toBe("E11.22");
    const anonymous = await anon.rpc("search_icd10_codes", { q: "e1122", p_payment_year: 2026 });
    expect(anonymous.error?.code).toBe("42501");
  });

  it("takes the start time from the database, never from the learner", async () => {
    const forged = await users.otherLearner.client
      .from("attempts")
      .insert({ chart_id: publishedChartId, user_id: users.otherLearner.id, started_at: "2020-01-01T00:00:00Z" });
    expect(forged.error?.code).toBe("42501");
  });

  it("allows one open attempt per chart", async () => {
    const first = await users.otherLearner.client
      .from("attempts")
      .insert({ chart_id: publishedChartId, user_id: users.otherLearner.id })
      .select("id")
      .single();
    expect(first.error).toBeNull();
    openAttemptId = first.data!.id;
    const second = await users.otherLearner.client.from("attempts").insert({ chart_id: publishedChartId, user_id: users.otherLearner.id });
    expect(second.error?.code).toBe("23505");
  });

  it("does not let a learner submit or score through the submission function", async () => {
    const own = await users.otherLearner.client.rpc("submit_scored_attempt", {
      p_attempt_id: openAttemptId,
      p_user_id: users.otherLearner.id,
      p_timezone: "America/New_York",
      p_codes: [{ icd10_code: "E11.22" }],
      p_result: { captured: ["HCC37"], missed: [], over_coded: [], precision: 1, recall: 1, raf_user: 1, raf_key: 1, raf_delta: 0, score_pct: 100 },
    });
    expect(own.error?.code).toBe("42501");
    const { data } = await service.from("attempts").select("submitted_at").eq("id", openAttemptId).single();
    expect(data?.submitted_at).toBeNull();
  });

  it("records a server-side submission in one step, readable only by its owner", async () => {
    const submitted = await service.rpc("submit_scored_attempt", {
      p_attempt_id: openAttemptId,
      p_user_id: users.otherLearner.id,
      p_timezone: "America/New_York",
      p_codes: [{ icd10_code: "E11.22", supporting_excerpt: "diabetic CKD", user_rationale: "" }],
      p_result: {
        captured: ["HCC37"],
        missed: [],
        over_coded: [],
        precision: 1,
        recall: 1,
        raf_user: 0.166,
        raf_key: 0.166,
        raf_delta: 0,
        score_pct: 100,
        breakdown: { version: 1 },
      },
    });
    expect(submitted.error).toBeNull();

    const mine = await users.otherLearner.client
      .from("attempts")
      .select("submitted_at, duration_seconds, attempt_results(captured, score_pct, breakdown), attempt_codes(icd10_code, user_rationale)")
      .eq("id", openAttemptId)
      .single();
    expect(mine.data?.submitted_at).not.toBeNull();
    expect(mine.data?.duration_seconds).toBeGreaterThanOrEqual(0);
    expect(mine.data?.attempt_results?.captured).toEqual(["HCC37"]);
    expect(mine.data?.attempt_codes).toEqual([{ icd10_code: "E11.22", user_rationale: null }]);

    const theirs = await users.learner.client.from("attempt_results").select("*").eq("attempt_id", openAttemptId);
    expect(theirs.data).toEqual([]);

    const again = await service.rpc("submit_scored_attempt", {
      p_attempt_id: openAttemptId,
      p_user_id: users.otherLearner.id,
      p_timezone: "America/New_York",
      p_codes: [],
      p_result: { captured: [], missed: [], over_coded: [], precision: 1, recall: 1, raf_user: 0, raf_key: 0, raf_delta: 0, score_pct: 100 },
    });
    expect(again.error?.code).toBe("P0002");
  });

  it("still cannot read the answer key after submitting", async () => {
    const key = await users.otherLearner.client.from("answer_key_items").select("*").eq("chart_id", publishedChartId);
    expect(key.data ?? []).toEqual([]);
    const distractors = await users.otherLearner.client.from("distractors").select("*").eq("chart_id", publishedChartId);
    expect(distractors.data ?? []).toEqual([]);
  });
});

describe("progress and timed mode (Phase 3)", () => {
  it("sets a timed attempt's limit in the database, from the chart's difficulty", async () => {
    const timed = await users.learner.client
      .from("attempts")
      .insert({ chart_id: publishedChartId, user_id: users.learner.id, mode: "timed" })
      .select("mode, time_limit_seconds")
      .single();
    expect(timed.error).toBeNull();
    expect(timed.data).toEqual({ mode: "timed", time_limit_seconds: 600 }); // difficulty 1

    const forged = await users.otherLearner.client
      .from("attempts")
      .insert({ chart_id: draftChartId, user_id: users.otherLearner.id, mode: "timed", time_limit_seconds: 99999 });
    expect(forged.error?.code).toBe("42501");
  });

  it("refuses audit mode until it exists", async () => {
    const audit = await users.sneaky.client.from("attempts").insert({ chart_id: publishedChartId, user_id: users.sneaky.id, mode: "audit" });
    expect(audit.error?.code).toBe("22023");
  });

  it("counts a submission towards the learner's own local day, and remembers their zone", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const { data } = await users.otherLearner.client.from("daily_activity").select("activity_date, charts_completed");
    expect(data).toEqual([{ activity_date: today, charts_completed: 1 }]);
    const { data: profile } = await users.otherLearner.client.from("profiles").select("timezone").eq("id", users.otherLearner.id).single();
    expect(profile?.timezone).toBe("America/New_York");
  });

  it("lets no learner write activity or their own zone", async () => {
    const write = await users.learner.client.from("daily_activity").insert({ user_id: users.learner.id, activity_date: "2025-01-01", charts_completed: 99 });
    expect(write.error?.code).toBe("42501");
    const zone = await users.learner.client.from("profiles").update({ timezone: "Asia/Tokyo" }).eq("id", users.learner.id);
    expect(zone.error?.code).toBe("42501");
  });
});

describe("an anonymous visitor", () => {
  it("can read public reference data", async () => {
    const { data } = await anon.from("hcc_categories").select("hcc_code").eq("payment_year", 2026).eq("hcc_code", "HCC37");
    expect(data).toEqual([{ hcc_code: "HCC37" }]);
  });

  it("cannot read charts, keys, distractors, profiles or attempts", async () => {
    for (const table of ["charts", "chart_sections", "answer_key_items", "distractors", "profiles", "attempts"] as const) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(data ?? [], table).toEqual([]);
      expect(error?.code, table).toBe("42501");
    }
  });

  it("cannot write reference data", async () => {
    const write = await anon.from("hcc_categories").update({ raf_community_nondual: 9 }).eq("hcc_code", "HCC37");
    expect(write.error?.code).toBe("42501");
    const asLearner = await users.learner.client.from("icd10_codes").delete().eq("code", "E11.22");
    expect(asLearner.error?.code).toBe("42501");
  });
});

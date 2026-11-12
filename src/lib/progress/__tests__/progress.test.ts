import { describe, expect, it } from "vitest";
import { codingBalance, familyStats, modeStats, scoreTrend, trapStats } from "../analytics";
import { buildInsights } from "../insights";
import { recommendNextChart } from "../recommend";
import { computeStreaks, localDate } from "../streaks";
import type { AttemptSummary, ChartListing } from "../types";

let n = 0;
function attempt(overrides: Partial<AttemptSummary>): AttemptSummary {
  n += 1;
  return {
    id: `a${n}`,
    chartId: "c1",
    chartTitle: "Chart",
    specialty: "Family Medicine",
    difficulty: 1,
    mode: "practice",
    submittedAt: `2025-10-${String(n).padStart(2, "0")}T15:00:00Z`,
    durationSeconds: 600,
    timeLimitSeconds: null,
    scorePct: 80,
    recall: 1,
    precision: 1,
    rafDelta: 0,
    rafKey: 1,
    keyHccs: [],
    captured: [],
    missed: [],
    overCoded: [],
    trapsHit: [],
    trapsAvoided: [],
    ...overrides,
  };
}

const GROUPS: Record<number, string> = { 37: "diabetes", 38: "diabetes", 224: "hf", 226: "hf", 23: "cancer", 280: "chr-lung", 329: "kidney" };
const groupOf = (h: number) => GROUPS[h] ?? `hcc-${h}`;
const groupLabel = (g: string) => ({ diabetes: "Diabetes", hf: "Heart failure", cancer: "Cancer" })[g] ?? g;
const hccLabel = (h: number) => `HCC${h}`;

describe("computeStreaks", () => {
  it("counts consecutive local days ending today", () => {
    expect(computeStreaks(["2025-10-01", "2025-10-02", "2025-10-03"], "2025-10-03")).toEqual({ current: 3, longest: 3, activeToday: true });
  });

  it("keeps a streak alive through today if yesterday was active", () => {
    expect(computeStreaks(["2025-10-01", "2025-10-02"], "2025-10-03")).toEqual({ current: 2, longest: 2, activeToday: false });
  });

  it("breaks after a whole missed day, but remembers the longest", () => {
    expect(computeStreaks(["2025-09-01", "2025-09-02", "2025-09-03", "2025-10-01"], "2025-10-03")).toEqual({
      current: 0,
      longest: 3,
      activeToday: false,
    });
  });

  it("crosses month ends and ignores duplicates", () => {
    expect(computeStreaks(["2025-09-30", "2025-10-01", "2025-10-01"], "2025-10-01").current).toBe(2);
  });

  it("dates an instant in the learner's own time zone", () => {
    const lateEvening = new Date("2025-10-02T03:30:00Z"); // 23:30 on Oct 1 in New York
    expect(localDate(lateEvening, "America/New_York")).toBe("2025-10-01");
    expect(localDate(lateEvening, "Asia/Kolkata")).toBe("2025-10-02");
  });
});

describe("scoreTrend", () => {
  it("orders by submission time with a three-point rolling mean", () => {
    const t = scoreTrend([attempt({ scorePct: 90, submittedAt: "2025-10-03T00:00:00Z" }), attempt({ scorePct: 60, submittedAt: "2025-10-01T00:00:00Z" })]);
    expect(t.points.map((p) => p.scorePct)).toEqual([60, 90]);
    expect(t.points[1].rolling).toBe(75);
    expect(t.direction).toBeNull();
  });

  it("calls a five-point move between windows of five a direction", () => {
    const scores = [50, 55, 60, 50, 55, 70, 75, 80, 70, 75];
    const t = scoreTrend(scores.map((scorePct) => attempt({ scorePct })));
    expect(t.previousAvg).toBe(54);
    expect(t.recentAvg).toBe(74);
    expect(t.direction).toBe("up");
  });
});

describe("trapStats and familyStats", () => {
  it("rates each trap per chart that planted it, worst first", () => {
    const stats = trapStats([
      attempt({ trapsHit: ["status_vs_history"], trapsAvoided: ["missing_acuity"] }),
      attempt({ trapsHit: ["status_vs_history"], trapsAvoided: ["missing_acuity", "status_vs_history"] }),
      attempt({ trapsAvoided: ["status_vs_history"] }),
    ]);
    expect(stats).toEqual([
      { trap: "status_vs_history", hits: 2, opportunities: 3, rate: 2 / 3 },
      { trap: "missing_acuity", hits: 0, opportunities: 2, rate: 0 },
    ]);
  });

  it("counts one mistake that misses the key code and codes the distractor as one hit", () => {
    // I50.22 for I50.23: the key item and the distractor both carry missing_acuity.
    const stats = trapStats([attempt({ trapsHit: ["missing_acuity", "missing_acuity"] })]);
    expect(stats).toEqual([{ trap: "missing_acuity", hits: 1, opportunities: 1, rate: 1 }]);
  });

  it("groups missed and over-coded HCCs by family", () => {
    const stats = familyStats(
      [attempt({ keyHccs: [37, 280], missed: [37] }), attempt({ keyHccs: [37], missed: [37], overCoded: [38] }), attempt({ overCoded: [23] })],
      groupOf,
    );
    expect(stats[0]).toEqual({ group: "diabetes", onKey: 2, missed: 2, overCoded: 1, missedHccs: [37], overCodedHccs: [38] });
    expect(stats.map((s) => s.group)).toEqual(["diabetes", "cancer"]);
  });

  it("reads the lean of the errors", () => {
    expect(codingBalance([attempt({ missed: [37, 280] }), attempt({ missed: [329] })]).tendency).toBe("undercoding");
    expect(codingBalance([attempt({ overCoded: [23, 38] })]).tendency).toBe("overcoding");
    expect(codingBalance([attempt({ missed: [37], overCoded: [23] })]).tendency).toBe("balanced");
  });

  it("separates timed from practice, counting finishes within the limit", () => {
    const stats = modeStats([
      attempt({ mode: "timed", timeLimitSeconds: 600, durationSeconds: 590, scorePct: 60 }),
      attempt({ mode: "timed", timeLimitSeconds: 600, durationSeconds: 700, scorePct: 70 }),
      attempt({ mode: "timed", timeLimitSeconds: 600, durationSeconds: 603, scorePct: 65 }), // auto-submit latency: within grace
      attempt({ scorePct: 90 }),
    ]);
    expect(stats.timed).toMatchObject({ count: 3, meanScore: 65, withinLimit: 2 });
    expect(stats.practice).toMatchObject({ count: 1, meanScore: 90 });
  });
});

describe("buildInsights — the Phase 3 bar: after five charts, say something new", () => {
  // A learner who thinks they're fine (scores in the 70s) but keeps missing the
  // same family and keeps falling for history-coded-as-active.
  const five = [
    attempt({ scorePct: 79, recall: 0.67, keyHccs: [37, 280, 329], captured: [280, 329], missed: [37], rafDelta: -0.166, trapsHit: ["status_vs_history"], trapsAvoided: ["missing_acuity"] }),
    attempt({ scorePct: 72, recall: 0.5, keyHccs: [224, 238], captured: [238], missed: [224], rafDelta: -0.36, trapsAvoided: ["missing_acuity"] }),
    attempt({ scorePct: 76, recall: 0.75, keyHccs: [37, 155, 253, 327], captured: [155, 253, 327], missed: [37], rafDelta: -0.166, trapsHit: ["status_vs_history"] }),
    attempt({ scorePct: 88, keyHccs: [37, 280, 329], captured: [37, 280, 329], trapsAvoided: ["unspecified_when_specific_exists"] }),
    attempt({ scorePct: 70, recall: 0.67, precision: 0.67, keyHccs: [224, 238, 37], captured: [238, 224], missed: [37], overCoded: [23], rafDelta: -0.02, trapsHit: ["status_vs_history"] }),
  ];
  const insights = buildInsights(five, groupOf, groupLabel, hccLabel);

  it("names the lean of the errors, with the numbers behind it", () => {
    const tendency = insights.find((i) => i.id === "tendency");
    expect(tendency?.title).toBe("You undercode more than you overcode");
    expect(tendency?.detail).toContain("4 missed HCCs against 1 over-coded across 5 charts");
  });

  it("names the trap that keeps catching them", () => {
    expect(insights.find((i) => i.id === "trap-status_vs_history")?.detail).toBe(
      "It caught you in 3 of the 3 charts that planted one (100%).",
    );
  });

  it("names the costliest HCC family and the HCC inside it", () => {
    const family = insights.find((i) => i.id.startsWith("family-"));
    expect(family?.title).toBe("Diabetes is your costliest HCC family");
    expect(family?.detail).toBe("Across your charts you missed 3 times (HCC37); it was on the key 4 times.");
  });

  it("credits a trap they reliably get past", () => {
    expect(insights.find((i) => i.kind === "strength")?.title).toBe("Missing acuity: solid");
  });

  it("puts weaknesses first and stays silent without data", () => {
    expect(insights[0].kind).toBe("weakness");
    expect(buildInsights([], groupOf, groupLabel, hccLabel)).toEqual([]);
  });
});

describe("recommendNextChart — public metadata only", () => {
  const charts: ChartListing[] = [
    { id: "f1", title: "A foundational", specialty: "Family Medicine", difficulty: 1 },
    { id: "c2", title: "B cardiology", specialty: "Cardiology", difficulty: 2 },
    { id: "i2", title: "C internal", specialty: "Internal Medicine", difficulty: 2 },
    { id: "i3", title: "D advanced", specialty: "Internal Medicine", difficulty: 3 },
  ];

  it("starts a new learner on a foundational chart", () => {
    expect(recommendNextChart({ charts, attempts: [], openDraftChartIds: [] })?.chartId).toBe("f1");
  });

  it("sends them back to a draft first", () => {
    expect(recommendNextChart({ charts, attempts: [], openDraftChartIds: ["i3"] })).toMatchObject({ chartId: "i3" });
  });

  it("steps up after strong form, preferring the specialty they score lowest in", () => {
    const attempts = [
      attempt({ chartId: "f1", difficulty: 1, scorePct: 92, specialty: "Family Medicine" }),
      attempt({ chartId: "x", difficulty: 1, scorePct: 90, specialty: "Internal Medicine" }),
    ];
    const pick = recommendNextChart({ charts, attempts, openDraftChartIds: [] });
    expect(pick?.chartId).toBe("c2"); // difficulty 2; untried Cardiology (50) ranks below Internal Medicine (90)
    expect(pick?.reason).toContain("a step up");
  });

  it("steps down after weak form", () => {
    const attempts = [attempt({ chartId: "i2", difficulty: 2, scorePct: 40, specialty: "Internal Medicine" })];
    expect(recommendNextChart({ charts, attempts, openDraftChartIds: [] })?.chartId).toBe("f1");
  });

  it("offers the weakest retry once everything is scored", () => {
    const attempts = charts.map((c, i) => attempt({ chartId: c.id, difficulty: c.difficulty, scorePct: [100, 64, 90, 75][i] }));
    expect(recommendNextChart({ charts, attempts, openDraftChartIds: [] })).toMatchObject({ chartId: "c2", reason: "Your best here is 64%. Code it again." });
  });
});

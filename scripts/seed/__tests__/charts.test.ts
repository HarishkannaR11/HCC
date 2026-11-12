/**
 * Guards on the seed content itself: synthetic markers, verbatim excerpts,
 * and the risk-adjustment rules the charts are designed to teach.
 */
import { describe, expect, it } from "vitest";
import { serviceYearFor } from "../../../src/lib/charts/constants";
import { SEED_CHARTS } from "../charts";

describe("seed charts", () => {
  it("are exactly three, with unique ids", () => {
    expect(SEED_CHARTS).toHaveLength(3);
    expect(new Set(SEED_CHARTS.map((c) => c.id)).size).toBe(3);
  });

  for (const chart of SEED_CHARTS) {
    describe(chart.title, () => {
      it("uses a synthetic MRN", () => {
        expect(chart.patient.mrn).toMatch(/^SYN-[A-Z0-9-]{3,20}$/);
      });

      it("is dated in the service year for its payment year", () => {
        expect(Number(chart.encounterDate.slice(0, 4))).toBe(serviceYearFor(chart.paymentYear));
      });

      it("quotes every supporting excerpt verbatim from the chart", () => {
        const text = Object.values(chart.sections).join("\n");
        for (const item of chart.key) expect(text, item.code).toContain(item.excerpt);
      });

      it("has an assessment & plan, a signature and at least one required code", () => {
        expect(chart.sections.assessment_plan).toBeTruthy();
        expect(chart.sections.signature).toBeTruthy();
        expect(chart.key.some((k) => k.required)).toBe(true);
      });

      it("never lists a code as both right and wrong", () => {
        const key = new Set(chart.key.map((k) => k.code));
        for (const d of chart.distractors) expect(key.has(d.code), d.code).toBe(false);
      });
    });
  }
});

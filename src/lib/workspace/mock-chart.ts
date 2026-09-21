/**
 * MOCK — the Phase 0 seed chart (72M, T2DM with diabetic CKD stage 3a, COPD,
 * hyperlipidemia), hand-transcribed from docs/build-plan.md's seed note.
 *
 * Block ids are stable strings ("hpi.0", "ap.2", ...) because an evidence
 * link is (blockId, start, end) — the real `charts.body` JSONB is shaped
 * exactly like this (see supabase/migrations/0002_charts.sql), so this file
 * disappears once GET /api/chart/[id] exists; nothing about its shape changes.
 */
import type { Chart } from "./types";

export const MOCK_CHART: Chart = {
  id: "dm-ckd-copd-72m",
  title: "Office visit · progress note",
  difficulty: "intermediate",
  position: { index: 1, total: 10 },

  patientRef: "PX-0142",
  patientAge: 72,
  patientSex: "male",
  dateOfService: "2026-09-12",
  visitType: "Face-to-face",

  hint: "The assessment and plan addresses three chronic conditions. Code only what has MEAT support in this encounter.",

  body: {
    sections: [
      {
        id: "cc",
        heading: "Chief complaint",
        kind: "prose",
        blocks: [{ id: "cc.0", text: "Follow-up for diabetes and kidney function." }],
      },
      {
        id: "hpi",
        heading: "History of present illness",
        kind: "prose",
        blocks: [
          {
            id: "hpi.0",
            text: "72-year-old male with type 2 diabetes mellitus with diabetic chronic kidney disease presents for 3-month follow-up. Reports good adherence to metformin. Mild dyspnea on exertion, unchanged from baseline; uses tiotropium daily. Denies chest pain, edema or recent hospitalization.",
          },
        ],
      },
      {
        id: "meds",
        heading: "Medications",
        kind: "prose",
        blocks: [
          {
            id: "meds.0",
            text: "Metformin 500 mg BID (dose reduced for eGFR) · Tiotropium 18 mcg inhaled daily · Atorvastatin 40 mg daily",
          },
        ],
      },
      {
        id: "labs",
        heading: "Labs",
        kind: "prose",
        blocks: [
          {
            id: "labs.0",
            text: "HbA1c 7.4% · eGFR 52 mL/min/1.73m² · Creatinine 1.4 mg/dL · UACR 88 mg/g",
          },
        ],
      },
      {
        id: "ap",
        heading: "Assessment and plan",
        kind: "ordered",
        blocks: [
          {
            id: "ap.0",
            text: "Type 2 diabetes with diabetic CKD, stage 3a — A1c 7.4%, eGFR 52 and stable. Continue metformin at reduced dose; recheck BMP in 3 months.",
          },
          {
            id: "ap.1",
            text: "COPD — stable on tiotropium, no exacerbations since last visit. Continue current regimen.",
          },
          { id: "ap.2", text: "Hyperlipidemia — continue atorvastatin." },
        ],
      },
    ],
    signature: "Electronically signed · [PROVIDER NAME], MD",
  },
};

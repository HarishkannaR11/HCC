/**
 * The three hand-written seed charts.
 *
 * EVERY PERSON, DATE, MRN, PROVIDER AND FACILITY HERE IS INVENTED. These are
 * synthetic teaching charts; no real patient record was used or consulted.
 *
 * Each chart is built around specific V28 behaviour so a reviewer can check
 * the result screen by hand:
 *
 *   1. Diabetes + CKD 3a + COPD  -> key HCCs {37, 280, 329}, RAF 0.612
 *   2. HF exacerbation           -> I11.0 (HCC226) is trimmed by I50.23
 *                                   (HCC224); key HCCs {224, 238}, RAF 0.659
 *   3. Multimorbidity            -> Z79.4 (HCC38) is trimmed by E11.42
 *                                   (HCC37); key HCCs {37, 155, 253, 327},
 *                                   RAF 1.366
 *
 * Supporting excerpts are verbatim substrings of the chart text; the seed
 * script asserts it.
 */
import type { PatientSex, SectionType, TrapType } from "../../src/lib/charts/constants";

export interface SeedKeyItem {
  code: string;
  required: boolean;
  excerpt: string;
  rationale: string;
  trap: TrapType;
}

export interface SeedDistractor {
  code: string;
  whyWrong: string;
  trap: TrapType;
}

export interface SeedChart {
  id: string;
  title: string;
  specialty: string;
  difficulty: 1 | 2 | 3;
  paymentYear: number;
  encounterDate: string;
  patient: { name: string; dob: string; sex: PatientSex; mrn: string };
  provider: string;
  facility: string;
  sections: Partial<Record<SectionType, string>>;
  key: SeedKeyItem[];
  distractors: SeedDistractor[];
}

export const SEED_CHARTS: SeedChart[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    title: "Diabetes and kidney follow-up",
    specialty: "Family Medicine",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-09-12",
    patient: { name: "Walter Brennick", dob: "1953-03-14", sex: "male", mrn: "SYN-100142" },
    provider: "Priya Raman, MD",
    facility: "Riverbend Family Practice",
    sections: {
      hpi:
        "72-year-old male with type 2 diabetes mellitus with diabetic chronic kidney disease presents for 3-month follow-up. " +
        "Reports good adherence to metformin. Mild dyspnea on exertion, unchanged from baseline; uses tiotropium daily. " +
        "Denies chest pain, edema or recent hospitalization.",
      ros:
        "Constitutional: no fever, weight stable. Respiratory: chronic mild exertional dyspnea, no change in cough or sputum. " +
        "Cardiovascular: no chest pain, no leg swelling. Genitourinary: no dysuria or hematuria.",
      physical_exam:
        "BP 132/78, HR 76, RR 16, SpO2 95% on room air, BMI 29.4. Lungs: mildly diminished breath sounds bilaterally, no wheezes. " +
        "Heart: regular rate and rhythm. Extremities: no edema. Feet: monofilament sensation intact bilaterally, pulses 2+.",
      medications: "Metformin 500 mg twice daily (dose reduced for eGFR)\nTiotropium 18 mcg inhaled daily\nAtorvastatin 40 mg daily",
      labs: "HbA1c 7.4%\neGFR 52 mL/min/1.73m²\nCreatinine 1.4 mg/dL\nUrine albumin-to-creatinine ratio 88 mg/g\nLDL 92 mg/dL",
      assessment_plan:
        "1. Type 2 diabetes with diabetic CKD, stage 3a. A1c 7.4%, eGFR 52 and stable. Continue metformin at reduced dose; recheck BMP and UACR in 3 months.\n" +
        "2. COPD, stable on tiotropium, no exacerbations since last visit. Continue current regimen.\n" +
        "3. Hyperlipidemia. LDL 92 on atorvastatin; continue.",
      signature: "Electronically signed by Priya Raman, MD on 09/12/2025 at 16:42.",
    },
    key: [
      {
        code: "E11.22",
        required: true,
        excerpt: "Type 2 diabetes with diabetic CKD, stage 3a",
        rationale:
          "The provider links the diabetes and the CKD, and ICD-10-CM's 'with' convention presumes that link anyway. E11.22 is paired with an N18 code for the stage.",
        trap: "none",
      },
      {
        code: "N18.31",
        required: true,
        excerpt: "stage 3a",
        rationale:
          "Stage 3a is documented and supported by eGFR 52. The unspecified stage 3 code (N18.30) is less specific than the record allows.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "J44.9",
        required: true,
        excerpt: "COPD, stable on tiotropium, no exacerbations since last visit",
        rationale: "COPD is assessed and treated (tiotropium continued). No exacerbation is documented, so J44.9 rather than J44.1.",
        trap: "none",
      },
      {
        code: "E78.5",
        required: true,
        excerpt: "Hyperlipidemia. LDL 92 on atorvastatin; continue.",
        rationale: "Supported and managed, but hyperlipidemia carries no HCC in V28. It belongs in a complete code set with no RAF impact.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "E11.9",
        whyWrong:
          "'Without complications' contradicts the documented diabetic CKD. E11.9 lands in HCC38, which E11.22's HCC37 outranks in the diabetes hierarchy.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "N18.30",
        whyWrong: "Stage 3a is documented, so the unspecified stage 3 code loses specificity the record supports.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "J44.1",
        whyWrong: "The note says there have been no exacerbations since the last visit. J44.1 requires a documented acute exacerbation.",
        trap: "missing_acuity",
      },
    ],
  },

  {
    id: "00000000-0000-4000-8000-000000000102",
    title: "Post-discharge heart failure visit",
    specialty: "Cardiology",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-04-03",
    patient: { name: "Rosalind Achterberg", dob: "1957-06-02", sex: "female", mrn: "SYN-200317" },
    provider: "Marcus Ellery, MD",
    facility: "Lakeshore Cardiology Associates",
    sections: {
      hpi:
        "67-year-old female with hypertension, heart failure with reduced ejection fraction (EF 35% on echo 01/2025), persistent atrial fibrillation " +
        "and coronary artery disease with a remote NSTEMI in 2019, seen 10 days after discharge for a heart failure exacerbation. " +
        "Discharged on furosemide 40 mg daily. Over the past 3 days her weight is up 4 lb and two-pillow orthopnea and ankle swelling have returned. " +
        "Denies chest pain. Adherent to apixaban and metoprolol.",
      ros:
        "Cardiovascular: orthopnea, bilateral ankle swelling; no chest pain, no palpitations. Respiratory: dyspnea after one flight of stairs, no cough. " +
        "Constitutional: fatigue, no fever.",
      physical_exam:
        "BP 148/88, HR 84 irregularly irregular, RR 20, SpO2 94% on room air, weight 238 lb (234 lb at discharge), BMI 41.2. " +
        "Neck: JVP 10 cm. Lungs: bibasilar crackles. Heart: irregularly irregular, no murmur. Extremities: 2+ pitting edema to mid-shin bilaterally.",
      medications:
        "Furosemide 40 mg daily\nMetoprolol succinate 100 mg daily\nSacubitril/valsartan 49/51 mg twice daily\nApixaban 5 mg twice daily\nAtorvastatin 80 mg daily",
      labs: "BNP 1,140 pg/mL (610 at discharge)\nSodium 136 mmol/L\nPotassium 4.1 mmol/L\nCreatinine 1.0 mg/dL\neGFR 68 mL/min/1.73m²",
      assessment_plan:
        "1. Acute on chronic systolic (congestive) heart failure due to hypertension. Volume overloaded with weight gain, JVD, crackles and rising BNP. " +
        "Increase furosemide to 40 mg twice daily for 5 days, then reassess; daily weights; 2 g sodium diet. Continue sacubitril/valsartan and metoprolol.\n" +
        "2. Persistent atrial fibrillation, rate controlled on metoprolol. Continue apixaban for stroke prevention; CHA2DS2-VASc 4.\n" +
        "3. Coronary artery disease with history of NSTEMI in 2019. No angina. Continue high-intensity atorvastatin.\n" +
        "4. Return in 1 week with BMP.",
      signature: "Electronically signed by Marcus Ellery, MD on 04/03/2025 at 17:05.",
    },
    key: [
      {
        code: "I11.0",
        required: true,
        excerpt: "heart failure due to hypertension",
        rationale:
          "ICD-10-CM presumes hypertension and heart failure are linked, and here it is stated. Sequence I11.0 first with the heart failure type. " +
          "I11.0 maps to HCC226, which I50.23's HCC224 trims in the heart failure hierarchy.",
        trap: "none",
      },
      {
        code: "I50.23",
        required: true,
        excerpt: "Acute on chronic systolic (congestive) heart failure",
        rationale:
          "An acute exacerbation of chronic HFrEF is documented and actively treated (diuretic increased). Chronic-only I50.22 drops the acuity and lands in HCC226 instead of HCC224.",
        trap: "missing_acuity",
      },
      {
        code: "I48.19",
        required: true,
        excerpt: "Persistent atrial fibrillation, rate controlled on metoprolol",
        rationale: "Persistent AF is documented and managed. Unspecified AF (I48.91) also maps to HCC238 but is less specific than the record.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "I25.10",
        required: true,
        excerpt: "Coronary artery disease with history of NSTEMI in 2019. No angina.",
        rationale: "CAD without angina is assessed and treated (statin continued). No HCC in V28.",
        trap: "none",
      },
      {
        code: "I25.2",
        required: true,
        excerpt: "history of NSTEMI in 2019",
        rationale:
          "A 2019 infarction is healed and historical: I25.2 (old MI). The acute MI codes (I21.-) apply only within 4 weeks of onset.",
        trap: "status_vs_history",
      },
      {
        code: "Z79.01",
        required: false,
        excerpt: "Continue apixaban for stroke prevention",
        rationale: "Long-term anticoagulant use is reportable and supported. Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "I21.4",
        whyWrong:
          "The NSTEMI was in 2019. I21.- codes cover the 4 weeks after onset; after that the condition is historical (I25.2). I21.4 would add an unsupported HCC228.",
        trap: "status_vs_history",
      },
      {
        code: "I50.22",
        whyWrong: "The note documents an acute exacerbation being treated today. Chronic-only loses the acuity: HCC226 instead of HCC224.",
        trap: "missing_acuity",
      },
      {
        code: "E66.01",
        whyWrong:
          "BMI 41.2 appears only in the vitals. The provider never diagnoses or addresses obesity, so there is no MEAT for E66.01 (HCC48).",
        trap: "no_treatment_documented",
      },
      {
        code: "Z68.41",
        whyWrong:
          "A BMI code is reportable only alongside a provider-documented associated condition such as obesity. None is documented, so Z68.41 (HCC48) is unsupported.",
        trap: "no_treatment_documented",
      },
      {
        code: "I10",
        whyWrong: "With heart failure present, ICD-10-CM presumes the hypertension is linked. I10 is replaced by I11.0.",
        trap: "none",
      },
    ],
  },

  {
    id: "00000000-0000-4000-8000-000000000103",
    title: "Chronic care visit, multiple conditions",
    specialty: "Internal Medicine",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-10-21",
    patient: { name: "Dorothea Vance", dob: "1944-11-20", sex: "female", mrn: "SYN-300508" },
    provider: "Samuel Ortega-Lind, DO",
    facility: "Cedar Hollow Internal Medicine",
    sections: {
      hpi:
        "80-year-old female here for chronic care follow-up. Mood has been lower since her sister died in August; PHQ-9 today is 14 (6 in May). " +
        "This is her third major depressive episode; episodes in 2012 and 2019 responded to sertraline. Denies suicidal ideation. " +
        "Fasting sugars 140-180 on basal insulin. Burning and numbness in both feet, worse at night. " +
        "Nephrology is following her kidney function, which has declined this year. " +
        "Right-sided weakness since a left MCA ischemic stroke in 2021; walks with a cane. " +
        "Left breast cancer treated in 2014 with lumpectomy and radiation; completed anastrozole in 2019; screening mammogram 06/2025 negative.",
      ros:
        "Constitutional: fatigue, reduced appetite, weight stable. Psychiatric: low mood, poor sleep, no suicidal or homicidal ideation. " +
        "Neurologic: numbness and burning in both feet; chronic right-sided weakness, unchanged. Breast: no masses, no nipple discharge.",
      physical_exam:
        "BP 142/84, HR 72, BMI 27.1. Affect flat and intermittently tearful; thought process linear. " +
        "Strength 4/5 right upper and lower extremity, 5/5 left; ambulates with a quad cane. " +
        "Monofilament sensation decreased in both feet to the ankles; vibration absent at the toes. Breasts: well-healed left lumpectomy scar, no masses.",
      medications:
        "Sertraline 50 mg daily\nInsulin glargine 22 units at bedtime\nGabapentin 300 mg at bedtime\nAmlodipine 10 mg daily\nLosartan 100 mg daily\nAspirin 81 mg daily\nAtorvastatin 40 mg daily",
      labs:
        "eGFR 26 mL/min/1.73m² (34 in 01/2025)\nCreatinine 1.9 mg/dL\nUrine albumin-to-creatinine ratio 12 mg/g\nHbA1c 8.1%\nDilated eye exam 03/2025: no diabetic retinopathy",
      assessment_plan:
        "1. Major depressive disorder, recurrent, moderate. Third episode, PHQ-9 14 after bereavement. Increase sertraline to 100 mg daily; referred to behavioral health for therapy; safety plan reviewed. Repeat PHQ-9 in 4 weeks.\n" +
        "2. Type 2 diabetes with diabetic polyneuropathy. A1c 8.1% on basal insulin. Increase glargine to 24 units; continue gabapentin for neuropathic pain; podiatry referral.\n" +
        "3. Chronic kidney disease, stage 4, due to hypertensive nephrosclerosis. eGFR 26, down from 34. Not felt to be diabetic kidney disease given minimal albuminuria and no retinopathy; nephrology concurs. Continue losartan and amlodipine; avoid NSAIDs; nephrology follow-up in 6 weeks.\n" +
        "4. Hemiparesis of right dominant side following ischemic stroke (2021). Deficits stable; continue aspirin and statin; home exercise program.\n" +
        "5. Personal history of left breast cancer. Treatment completed 2019, no evidence of recurrence on 06/2025 mammogram. Continue annual surveillance.",
      signature: "Electronically signed by Samuel Ortega-Lind, DO on 10/21/2025 at 15:12.",
    },
    key: [
      {
        code: "F33.1",
        required: true,
        excerpt: "Major depressive disorder, recurrent, moderate",
        rationale:
          "Episode (recurrent) and severity (moderate) are both documented, with treatment. In V28, unspecified depression (F32.A) and MDD single episode unspecified (F32.9) carry no HCC; F33.1 maps to HCC155.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "E11.42",
        required: true,
        excerpt: "Type 2 diabetes with diabetic polyneuropathy",
        rationale: "The link is stated, and the neuropathy is evaluated (monofilament, vibration) and treated (gabapentin, podiatry).",
        trap: "none",
      },
      {
        code: "Z79.4",
        required: true,
        excerpt: "A1c 8.1% on basal insulin",
        rationale:
          "Report long-term insulin use with type 2 diabetes. In V28 Z79.4 maps to HCC38, which E11.42's HCC37 trims, so it adds no RAF here but is still part of complete coding.",
        trap: "none",
      },
      {
        code: "N18.4",
        required: true,
        excerpt: "Chronic kidney disease, stage 4",
        rationale: "The stage is documented and managed (eGFR trend, ARB, nephrology follow-up).",
        trap: "none",
      },
      {
        code: "I12.9",
        required: true,
        excerpt: "due to hypertensive nephrosclerosis",
        rationale:
          "Hypertension with CKD is presumed linked, and is stated here: I12.9 with N18.4. No HCC in V28; the CKD stage carries the risk.",
        trap: "none",
      },
      {
        code: "I69.351",
        required: true,
        excerpt: "Hemiparesis of right dominant side following ischemic stroke (2021)",
        rationale:
          "The stroke is historical but its residual deficit is current. Use the sequela combination code I69.351, not an acute stroke code.",
        trap: "status_vs_history",
      },
      {
        code: "Z85.3",
        required: true,
        excerpt: "Personal history of left breast cancer. Treatment completed 2019, no evidence of recurrence",
        rationale:
          "Treatment is complete and there is no current disease, so the history code applies. Active cancer codes (C50.-) need current disease or treatment directed at it.",
        trap: "status_vs_history",
      },
    ],
    distractors: [
      {
        code: "C50.912",
        whyWrong: "No active disease and no current treatment. C50.912 would add an unsupported HCC23.",
        trap: "status_vs_history",
      },
      {
        code: "I63.9",
        whyWrong: "I63.- codes cover the acute stroke episode. For a 2021 stroke with current residual deficits, use I69.3-.",
        trap: "status_vs_history",
      },
      {
        code: "E11.22",
        whyWrong:
          "The 'with' convention presumes diabetes and CKD are linked unless the provider documents another cause. Here the provider attributes the CKD to hypertensive nephrosclerosis and states it is not diabetic kidney disease.",
        trap: "unsupported_linkage",
      },
      {
        code: "F32.A",
        whyWrong: "Depression, unspecified ignores the documented recurrent, moderate episode, and in V28 it carries no HCC.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "G81.91",
        whyWrong: "When hemiparesis is a sequela of stroke, the I69.- combination code replaces a separate G81.- code.",
        trap: "none",
      },
    ],
  },
];

/**
 * The three hand-written seed charts.
 *
 * SYNTHETIC. Every patient, date of birth, MRN, provider, facility and sentence
 * below is invented. None is derived from a real record.
 *
 * Each chart plants specific documentation traps; the answer key says what is
 * right and why, the distractors say what is tempting and why it is wrong.
 * Expected V28 HCC captures (community non-dual aged, after hierarchy) are in
 * each chart's `expected` block so a reviewer can check the RAF by hand
 * against the CMS coefficient file.
 *
 * Load with `npm run seed:charts`. Charts arrive as drafts: an experienced coder
 * reviews every answer key before anything is published.
 */
import type { PatientSex, SectionType, TrapType } from "../../src/lib/charts/constants";

export interface SeedChart {
  id: string;
  title: string;
  specialty: string;
  difficulty: 1 | 2 | 3;
  paymentYear: number;
  encounterDate: string;
  patient: { name: string; dob: string; sex: PatientSex; mrn: string };
  providerName: string;
  facilityName: string;
  sections: { type: SectionType; content: string }[];
  answerKey: {
    code: string;
    required: boolean;
    trap: TrapType;
    excerpt: string;
    rationale: string;
  }[];
  distractors: { code: string; trap: TrapType; whyWrong: string }[];
  /** For the human reviewer and the tests; never loaded into the database. */
  expected: { scoringHccs: string[]; trimmedHccs: string[]; raf: number };
}

export const SEED_CHARTS: SeedChart[] = [
  // -------------------------------------------------------------------------
  {
    id: "c4a17000-0000-4000-8000-000000000001",
    title: "Primary care follow-up: diabetes with CKD, COPD",
    specialty: "Family Medicine",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-10-14",
    patient: { name: "Gerald T. Ashworth", dob: "1952-08-19", sex: "male", mrn: "SYN-204718" },
    providerName: "Dana Whitcombe, DO",
    facilityName: "Cedar Hollow Family Medicine",
    sections: [
      { type: "chief_complaint", content: "3-month follow-up of diabetes and kidney function. Medication refills." },
      {
        type: "hpi",
        content:
          "73-year-old male with type 2 diabetes mellitus and chronic kidney disease presents for routine follow-up. He checks fasting glucose most mornings; readings run 120s–140s. Taking metformin as prescribed; the dose was reduced in June for a declining eGFR. No hypoglycemic episodes. Denies polyuria, foot numbness or vision change.\n\nCOPD is stable. Chronic exertional dyspnea after one flight of stairs, unchanged from baseline. Uses tiotropium daily and albuterol about twice a week. No increase in cough or sputum, and no ED visits or steroid courses since last year. Former smoker, quit 2011, 40 pack-years.",
      },
      {
        type: "past_medical_history",
        content:
          "Type 2 diabetes mellitus (dx 2009). Chronic kidney disease. Hypertension. COPD. Hyperlipidemia. Colonoscopy 2022 with two tubular adenomas removed; repeat due 2027. Tonsillectomy in childhood.",
      },
      {
        type: "ros",
        content:
          "Constitutional: no fever, weight stable. Respiratory: chronic exertional dyspnea as above; no wheeze at rest. Cardiovascular: no chest pain, orthopnea or leg swelling. GU: no dysuria; nocturia x1. Neuro: no numbness or tingling in the feet. All other systems reviewed and negative.",
      },
      {
        type: "physical_exam",
        content:
          "BP 134/78, HR 76, RR 16, SpO2 94% on room air, Wt 92.3 kg, BMI 29.8.\nGeneral: well-appearing, in no distress.\nLungs: mildly diminished breath sounds at both bases, prolonged expiratory phase, no wheezes or crackles.\nHeart: regular rate and rhythm, no murmur.\nExtremities: no edema.\nFeet: monofilament sensation intact bilaterally, pedal pulses 2+, no lesions.",
      },
      {
        type: "medications",
        content:
          "Metformin 500 mg PO twice daily (reduced from 1000 mg twice daily 06/2025 for eGFR)\nLisinopril 20 mg PO daily\nAtorvastatin 40 mg PO daily\nTiotropium 18 mcg inhaled daily\nAlbuterol HFA 2 puffs every 4–6 hours as needed",
      },
      {
        type: "labs",
        content:
          "10/07/2025: HbA1c 7.2% (prior 7.4%). Creatinine 1.52 mg/dL, eGFR 47 mL/min/1.73m² (49 in 06/2025, 51 in 01/2025). Urine albumin-to-creatinine ratio 86 mg/g. Potassium 4.6 mmol/L. LDL 74 mg/dL.",
      },
      {
        type: "assessment_plan",
        content:
          "1. Type 2 diabetes mellitus with diabetic chronic kidney disease. A1c 7.2%, at goal for age. eGFR declining slowly with albuminuria, consistent with diabetic nephropathy. Continue metformin at reduced dose; stop if eGFR falls below 30. Will start empagliflozin 10 mg daily for renal protection once prior authorization returns.\n2. Chronic kidney disease stage 3a. eGFR 47 with albuminuria. Continue lisinopril. Repeat BMP and urine ACR in 3 months. Avoid NSAIDs — reviewed today.\n3. Hypertension. 134/78 today, at goal. Continue lisinopril 20 mg.\n4. COPD. Stable, no exacerbation this year; dyspnea at baseline. Continue tiotropium and albuterol as needed. Spirometry ordered. Influenza vaccine received at pharmacy 09/2025.\n5. Hyperlipidemia. LDL 74 on atorvastatin. Continue.\n\nReturn in 3 months with labs beforehand.",
      },
      { type: "signature", content: "Electronically signed by Dana Whitcombe, DO on 10/14/2025 at 16:42." },
    ],
    answerKey: [
      {
        code: "E11.22",
        required: true,
        trap: "unspecified_when_specific_exists",
        excerpt: "Type 2 diabetes mellitus with diabetic chronic kidney disease",
        rationale:
          "The provider links the diabetes and the CKD (\"diabetic chronic kidney disease\"), and ICD-10-CM presumes the link under \"with\" in any case. E11.22 captures the complication and maps to HCC37. E11.9 would under-specify and, on its own, land in HCC38. E11.22 instructs you to use an additional code for the CKD stage.",
      },
      {
        code: "N18.31",
        required: true,
        trap: "unspecified_when_specific_exists",
        excerpt: "Chronic kidney disease stage 3a",
        rationale:
          "Stage 3a is documented by the provider, so N18.31 (HCC329) rather than N18.30 (stage 3, unspecified). Take the stage from the provider's statement, not from the eGFR alone.",
      },
      {
        code: "I12.9",
        required: true,
        trap: "unspecified_when_specific_exists",
        excerpt: "Hypertension. 134/78 today, at goal",
        rationale:
          "ICD-10-CM presumes a causal relationship between hypertension and CKD (guideline I.C.9.a.2): hypertension with CKD stage 1–4 is I12.9, not I10. I12.9 carries no HCC in V28, so this is a specificity point rather than a RAF one; N18.31 still captures the CKD.",
      },
      {
        code: "J44.9",
        required: true,
        trap: "none",
        excerpt: "COPD. Stable, no exacerbation this year",
        rationale:
          "COPD is evaluated (exam, dyspnea at baseline) and treated (tiotropium, albuterol, spirometry ordered): J44.9, HCC280. No exacerbation is documented, so not J44.1.",
      },
      {
        code: "E78.5",
        required: true,
        trap: "none",
        excerpt: "Hyperlipidemia. LDL 74 on atorvastatin",
        rationale: "Monitored (LDL) and treated (atorvastatin). No HCC impact.",
      },
      {
        code: "Z79.84",
        required: false,
        trap: "none",
        excerpt: "Continue metformin at reduced dose",
        rationale:
          "Long-term use of an oral hypoglycemic (metformin). Good practice to report; no HCC impact, so it is accepted but not required.",
      },
      {
        code: "Z87.891",
        required: false,
        trap: "none",
        excerpt: "Former smoker, quit 2011, 40 pack-years",
        rationale: "Personal history of nicotine dependence. Accepted but not required; no HCC impact.",
      },
    ],
    distractors: [
      {
        code: "E11.9",
        trap: "unspecified_when_specific_exists",
        whyWrong:
          "E11.9 is diabetes without complications. The provider documents diabetic CKD, so E11.22 applies. Coding E11.9 alone would drop the patient from HCC37 to HCC38.",
      },
      {
        code: "I10",
        trap: "unspecified_when_specific_exists",
        whyWrong:
          "Hypertension and CKD are presumed linked in ICD-10-CM; code I12.9 with N18.31. I10 is for hypertension without heart or kidney involvement.",
      },
      {
        code: "N18.30",
        trap: "unspecified_when_specific_exists",
        whyWrong: "The provider documents stage 3a. N18.30 is stage 3, unspecified; use N18.31.",
      },
      {
        code: "J44.1",
        trap: "missing_acuity",
        whyWrong:
          "No exacerbation is documented: dyspnea is at baseline and there was no steroid or antibiotic course. J44.1 requires a documented acute exacerbation.",
      },
    ],
    expected: { scoringHccs: ["HCC37", "HCC280", "HCC329"], trimmedHccs: [], raf: 0.612 },
  },

  // -------------------------------------------------------------------------
  {
    id: "c4a17000-0000-4000-8000-000000000002",
    title: "Cardiology follow-up: heart failure and atrial fibrillation",
    specialty: "Cardiology",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-08-21",
    patient: { name: "Lorraine M. Feeney", dob: "1946-05-02", sex: "female", mrn: "SYN-318552" },
    providerName: "Anil Raghunathan, MD, FACC",
    facilityName: "Larkspur Heart & Vascular",
    sections: [
      { type: "chief_complaint", content: "Six-month heart failure and atrial fibrillation follow-up." },
      {
        type: "hpi",
        content:
          "79-year-old woman with nonischemic dilated cardiomyopathy and chronic heart failure with reduced ejection fraction, followed here since 2019, returns for routine follow-up. She walks her dog half a mile daily without stopping. Sleeps on one pillow; no orthopnea or PND. Home weights stable at 68–69 kg. Takes furosemide 20 mg every morning and has not needed extra doses.\n\nPersistent atrial fibrillation since 2022. She notices occasional palpitations but denies presyncope. Taking apixaban twice daily with no bleeding or falls. She asks whether she still needs to see her oncologist — she completed breast cancer treatment years ago.",
      },
      {
        type: "past_medical_history",
        content:
          "Nonischemic dilated cardiomyopathy, LVEF 30% (2019), improved to 35% (2024). Chronic HFrEF. Persistent atrial fibrillation. Hypertension. Left breast cancer, stage I: lumpectomy and radiation 2014, adjuvant anastrozole completed 2019. Rheumatoid arthritis. Osteopenia. Bilateral cataract surgery 2021.",
      },
      {
        type: "ros",
        content:
          "Constitutional: no fatigue beyond baseline, no weight change. Cardiovascular: occasional palpitations; no chest pain, orthopnea, PND or leg swelling. Respiratory: no cough, no dyspnea at rest. Breast: no lumps or changes on self-exam. Heme: no bruising or bleeding. All other systems negative.",
      },
      {
        type: "physical_exam",
        content:
          "BP 122/70, HR 74 irregularly irregular, RR 14, SpO2 97% on room air, Wt 68.4 kg (68.9 kg in February).\nGeneral: comfortable, in no distress.\nNeck: JVP 7 cm, no hepatojugular reflux.\nLungs: clear to auscultation, no crackles.\nHeart: irregularly irregular rhythm, normal S1 and S2, soft II/VI holosystolic murmur at the apex, no S3.\nAbdomen: soft, no hepatomegaly.\nExtremities: warm, no edema.",
      },
      {
        type: "medications",
        content:
          "Sacubitril-valsartan 49/51 mg PO twice daily\nCarvedilol 12.5 mg PO twice daily\nSpironolactone 25 mg PO daily\nFurosemide 20 mg PO every morning\nApixaban 5 mg PO twice daily\nCalcium with vitamin D PO daily",
      },
      {
        type: "labs",
        content:
          "08/14/2025: Sodium 138, potassium 4.4, creatinine 0.88 mg/dL, eGFR 66. NT-proBNP 612 pg/mL (1,140 in 02/2025). Hemoglobin 12.8 g/dL.\nECG today: atrial fibrillation, ventricular rate 72, QRS 104 ms.\nEchocardiogram 03/2025: LVEF 35%, moderate LV dilation, mild mitral regurgitation.\nScreening mammogram 03/2025: BI-RADS 2, benign.",
      },
      {
        type: "assessment_plan",
        content:
          "1. Chronic systolic heart failure (HFrEF), NYHA class II, due to nonischemic dilated cardiomyopathy. Compensated and euvolemic today; weight stable, NT-proBNP improving, LVEF 35%. Continue sacubitril-valsartan, carvedilol, spironolactone and furosemide 20 mg daily. Will discuss adding an SGLT2 inhibitor at the next visit.\n2. Hypertension. Well controlled at 122/70 on her heart failure regimen.\n3. Persistent atrial fibrillation. Rate controlled on carvedilol, ventricular rate 72 on ECG. CHA2DS2-VASc 5 (age, female, heart failure, hypertension). Continue apixaban 5 mg twice daily; no dose-reduction criteria met. No bleeding.\n4. History of left breast cancer. Stage I, treated with lumpectomy and radiation in 2014 and anastrozole through 2019. No evidence of recurrence; mammogram 03/2025 benign. No current treatment. Surveillance may move to her PCP per oncology.\n5. Long-term anticoagulation with apixaban, as above.\n\nFollow-up in 6 months with BMP and NT-proBNP beforehand; sooner for weight gain over 1 kg in a day or 2 kg in a week.",
      },
      { type: "signature", content: "Electronically signed by Anil Raghunathan, MD, FACC on 08/21/2025 at 11:18." },
    ],
    answerKey: [
      {
        code: "I11.0",
        required: true,
        trap: "unspecified_when_specific_exists",
        excerpt: "Hypertension. Well controlled at 122/70",
        rationale:
          "Hypertension with heart failure is presumed linked (guideline I.C.9.a.1): I11.0, sequenced before the heart failure type code. I11.0 maps to HCC226 in V28 — the same HCC as I50.22 — so the family scores once.",
      },
      {
        code: "I50.22",
        required: true,
        trap: "unspecified_when_specific_exists",
        excerpt: "Chronic systolic heart failure (HFrEF), NYHA class II",
        rationale:
          "Type (systolic, HFrEF) and acuity (chronic, compensated) are both documented: I50.22, HCC226. Not I50.9 (unspecified), and not I50.23 — nothing acute is documented.",
      },
      {
        code: "I42.0",
        required: true,
        trap: "none",
        excerpt: "due to nonischemic dilated cardiomyopathy",
        rationale:
          "Dilated cardiomyopathy is documented as the cause of the heart failure and is followed by echo: I42.0, HCC227. The V28 hierarchy suppresses HCC227 when HCC226 is present, so the code is correct but adds nothing to the RAF — the hierarchy removes it, not the coder.",
      },
      {
        code: "I48.19",
        required: true,
        trap: "unspecified_when_specific_exists",
        excerpt: "Persistent atrial fibrillation. Rate controlled on carvedilol",
        rationale:
          "\"Persistent\" is documented, so I48.19 (other persistent atrial fibrillation) rather than I48.91 (unspecified). Both map to HCC238; specificity is still what an auditor checks. Not I48.11 — longstanding persistent is not documented.",
      },
      {
        code: "Z79.01",
        required: true,
        trap: "none",
        excerpt: "Long-term anticoagulation with apixaban",
        rationale: "Current long-term apixaban. No HCC impact.",
      },
      {
        code: "Z85.3",
        required: true,
        trap: "status_vs_history",
        excerpt: "History of left breast cancer",
        rationale:
          "Treatment ended in 2019, there is no evidence of disease and no current treatment, so the cancer is history: Z85.3, no HCC. An active C50 code would add HCC23 the record does not support.",
      },
    ],
    distractors: [
      {
        code: "C50.912",
        trap: "status_vs_history",
        whyWrong:
          "An active-cancer code needs current treatment or evidence of disease. Lumpectomy, radiation and anastrozole were finished by 2019 and the 2025 mammogram is benign, so this is personal history (Z85.3). C50.912 would over-code HCC23.",
      },
      {
        code: "I50.23",
        trap: "missing_acuity",
        whyWrong:
          "Acute on chronic heart failure needs documented decompensation: new or worsening symptoms, volume overload, escalated diuretics. She is compensated and euvolemic with a stable weight, so I50.23 is unsupported — and it would move her into HCC224.",
      },
      {
        code: "M06.9",
        trap: "no_treatment_documented",
        whyWrong:
          "Rheumatoid arthritis appears only in the past medical history. Nothing in this note monitors, evaluates, assesses or treats it — no DMARD, no joint exam, no plan — so it cannot be coded from this encounter. It would add HCC93.",
      },
      {
        code: "I10",
        trap: "unspecified_when_specific_exists",
        whyWrong: "With heart failure present, hypertension is coded I11.0. I10 ignores the presumed link.",
      },
      {
        code: "I48.91",
        trap: "unspecified_when_specific_exists",
        whyWrong: "The provider documents persistent atrial fibrillation; I48.91 is unspecified. Use I48.19.",
      },
    ],
    expected: { scoringHccs: ["HCC226", "HCC238"], trimmedHccs: ["HCC227"], raf: 0.659 },
  },

  // -------------------------------------------------------------------------
  {
    id: "c4a17000-0000-4000-8000-000000000003",
    title: "Internal medicine visit: advanced CKD, diabetic complications, amputation status",
    specialty: "Internal Medicine",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-12-03",
    patient: { name: "Reginald O. Pruitt", dob: "1949-11-27", sex: "male", mrn: "SYN-427093" },
    providerName: "Helen Achterberg, MD",
    facilityName: "Juniper Ridge Internal Medicine",
    sections: [
      { type: "chief_complaint", content: "Follow-up of diabetes, kidney disease and weight loss." },
      {
        type: "hpi",
        content:
          "76-year-old man with type 2 diabetes, stage 4 chronic kidney disease and a right below-knee amputation (2021, after a nonhealing diabetic foot infection) returns for follow-up. Home glucose readings run 180s–260s fasting despite glargine 24 units nightly; he admits to skipping doses when his appetite is poor.\n\nHe has lost 7.3 kg over six months (73.0 to 65.7 kg) with early satiety; he eats one full meal a day, well under half his usual intake, for about two months. Burning pain and numbness in the left foot, worse at night, partly relieved by gabapentin. Walks with his prosthesis and a cane; prosthetist visit last month for socket refitting. Nephrology (Dr. Osei) saw him in October; dialysis education has been offered but not started.",
      },
      {
        type: "past_medical_history",
        content:
          "Type 2 diabetes mellitus (dx 1998), insulin-requiring since 2016. CKD stage 4. Diabetic peripheral neuropathy. Right below-knee amputation 06/2021. Hypertension. COPD (per problem list). Benign prostatic hyperplasia.\nSocial: lives with his daughter. Never smoker. No alcohol.",
      },
      {
        type: "ros",
        content:
          "Constitutional: weight loss as above, poor appetite, fatigue. Respiratory: no cough, wheeze or dyspnea. Cardiovascular: no chest pain or leg swelling. GI: early satiety; no vomiting, no melena, normal bowel movements. GU: nocturia x2. Neuro: burning and numbness in the left foot. Psych: mood \"down since the summer\", sleeping poorly. All other systems negative.",
      },
      {
        type: "physical_exam",
        content:
          "BP 144/82, HR 80, RR 16, SpO2 96% on room air, Wt 65.7 kg, Ht 185 cm, BMI 19.2.\nGeneral: thin, temporal wasting.\nLungs: clear bilaterally.\nHeart: regular, no murmur.\nAbdomen: soft, nontender.\nExtremities: right below-knee amputation; residual limb well healed, no skin breakdown at the socket line. Left foot without ulcers; dorsalis pedis pulse 1+.\nNeuro: monofilament sensation absent at 5 of 10 sites on the left foot; vibration sense reduced at the left great toe.\nPsych: flat affect.",
      },
      {
        type: "medications",
        content:
          "Insulin glargine 24 units SC nightly\nInsulin lispro sliding scale with meals (rarely used)\nGabapentin 100 mg PO at bedtime (renally dosed)\nAmlodipine 10 mg PO daily\nTamsulosin 0.4 mg PO daily\nCalcitriol 0.25 mcg PO daily",
      },
      {
        type: "labs",
        content:
          "11/24/2025: HbA1c 9.1% (8.3% in 05/2025). Creatinine 2.71 mg/dL, eGFR 24 mL/min/1.73m². Potassium 5.1 mmol/L. Bicarbonate 20 mmol/L. Albumin 3.0 g/dL. Hemoglobin 10.4 g/dL. PTH 142 pg/mL.\nPulmonary function tests 05/2023: FEV1/FVC 0.78, normal spirometry.",
      },
      {
        type: "assessment_plan",
        content:
          "1. Type 2 diabetes mellitus with diabetic chronic kidney disease and diabetic polyneuropathy, with hyperglycemia. A1c 9.1%, up from 8.3%; fasting readings 180s–260s with missed glargine doses. Change glargine to morning dosing at 20 units so it is not tied to his evening appetite; stop sliding-scale lispro. Diabetes educator referral. Polyneuropathy: continue gabapentin 100 mg at bedtime, renally dosed, no increase given eGFR. Daily left foot checks reviewed with patient and daughter; podiatry every 3 months.\n2. Chronic kidney disease stage 4. eGFR 24, potassium 5.1, bicarbonate 20. Low-potassium diet reviewed. Start sodium bicarbonate 650 mg twice daily. Continue calcitriol. Co-managed with nephrology; dialysis access planning at the January nephrology visit.\n3. Hypertension. 144/82 today, above goal; home readings in the 130s. Recheck in 4 weeks before adjusting.\n4. Moderate protein-calorie malnutrition. 10% weight loss over six months, intake under half of estimated needs for about two months, temporal wasting, albumin 3.0, BMI 19.2. Dietitian referral placed; renal-appropriate oral nutrition supplement twice daily. Reweigh in 4 weeks.\n5. Status post right below-knee amputation. Residual limb healthy; prosthesis refitted last month. Continue prosthetist follow-up.\n\nReturn in 4 weeks.",
      },
      { type: "signature", content: "Electronically signed by Helen Achterberg, MD on 12/03/2025 at 17:05." },
      {
        type: "addendum",
        content:
          "Addendum 12/04/2025 — pended, not signed.\nCalled patient regarding mood. PHQ-9 by phone: 14. Major depressive disorder, recurrent, moderate. Start sertraline 25 mg daily; follow-up in 2 weeks.\n[Draft — awaiting provider signature]",
      },
    ],
    answerKey: [
      {
        code: "E11.22",
        required: true,
        trap: "none",
        excerpt: "Type 2 diabetes mellitus with diabetic chronic kidney disease",
        rationale: "Linked by the provider, and presumed under \"with\" in any case: E11.22, HCC37.",
      },
      {
        code: "E11.42",
        required: true,
        trap: "none",
        excerpt: "and diabetic polyneuropathy",
        rationale:
          "Diabetic polyneuropathy, examined (monofilament, vibration) and treated (gabapentin): E11.42, also HCC37. Two codes in one HCC count once — the second is documentation completeness, not extra RAF.",
      },
      {
        code: "E11.65",
        required: true,
        trap: "none",
        excerpt: "with hyperglycemia",
        rationale:
          "\"With hyperglycemia\" (A1c 9.1%, fasting 180s–260s) is E11.65, which maps to HCC38 — and HCC37 suppresses HCC38. A correct code with no RAF effect: the hierarchy at work. \"Uncontrolled\" alone would not be enough; the provider has to say hyperglycemia.",
      },
      {
        code: "Z79.4",
        required: true,
        trap: "none",
        excerpt: "Change glargine to morning dosing at 20 units",
        rationale:
          "Long-term current insulin. In V28, Z79.4 maps to HCC38, suppressed here by HCC37. No oral agents, so no Z79.84.",
      },
      {
        code: "N18.4",
        required: true,
        trap: "none",
        excerpt: "Chronic kidney disease stage 4",
        rationale:
          "Stage 4 documented, eGFR 24, and treated (sodium bicarbonate, calcitriol, nephrology co-management): N18.4, HCC327. Dialysis planning does not make it stage 5.",
      },
      {
        code: "I12.9",
        required: true,
        trap: "unspecified_when_specific_exists",
        excerpt: "Hypertension. 144/82 today, above goal",
        rationale:
          "Hypertension with CKD stage 4 is presumed linked: I12.9 with N18.4, not I10. No HCC in V28.",
      },
      {
        code: "E44.0",
        required: true,
        trap: "none",
        excerpt: "Moderate protein-calorie malnutrition",
        rationale:
          "Documented with supporting criteria (10% loss over six months, low intake, wasting) and a plan: E44.0. V24 paid this as HCC21; V28 removed malnutrition from the payment model, so it has no HCC for PY2026. Code it anyway — it is supported.",
      },
      {
        code: "Z89.511",
        required: true,
        trap: "status_vs_history",
        excerpt: "Status post right below-knee amputation",
        rationale:
          "An amputation is a permanent status, not a resolved history: Z89.511 (acquired absence of right leg below knee), HCC409. Often missed because \"status post\" reads like history.",
      },
      {
        code: "Z68.1",
        required: false,
        trap: "none",
        excerpt: "BMI 19.2",
        rationale:
          "BMI may be reported because the provider documents an associated diagnosis (malnutrition). Accepted but not required; no HCC impact.",
      },
    ],
    distractors: [
      {
        code: "F33.1",
        trap: "signature_or_date_missing",
        whyWrong:
          "The depression diagnosis appears only in an addendum that is pended and unsigned. Unsigned documentation cannot support a code, however plausible. Once the provider signs it, F33.1 (HCC155) would be supportable.",
      },
      {
        code: "J44.9",
        trap: "no_treatment_documented",
        whyWrong:
          "COPD is on the problem list only. He has never smoked, spirometry in 2023 was normal, and nothing in this note monitors, evaluates, assesses or treats it. A problem-list carry-forward like this is a classic over-code (HCC280).",
      },
      {
        code: "N18.5",
        trap: "none",
        whyWrong:
          "Dialysis planning does not make the CKD stage 5. The provider documents stage 4 with an eGFR of 24. N18.5 would over-code HCC326 in place of HCC327.",
      },
      {
        code: "E11.9",
        trap: "unspecified_when_specific_exists",
        whyWrong: "This patient's diabetes has documented complications; E11.9 (without complications) contradicts the record.",
      },
    ],
    expected: { scoringHccs: ["HCC37", "HCC327", "HCC409"], trimmedHccs: ["HCC38"], raf: 1.278 },
  },
];

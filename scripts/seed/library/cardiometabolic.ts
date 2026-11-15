/**
 * Library charts: Cardiology, Endocrinology, Nephrology.
 *
 * EVERY PERSON, DATE, MRN, PROVIDER AND FACILITY HERE IS INVENTED. Synthetic
 * teaching charts; no real patient record was used or consulted.
 */
import type { SeedChart } from "../types";

export const CARDIOMETABOLIC_CHARTS: SeedChart[] = [
  // --- Cardiology ------------------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000113",
    title: "Chronic systolic heart failure follow-up",
    specialty: "Cardiology",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-02-26",
    patient: { name: "Odessa Brightwater", dob: "1952-10-08", sex: "female", mrn: "SYN-440175" },
    provider: "Rafael Domingo, MD",
    facility: "Bayview Heart Institute",
    sections: {
      hpi:
        "72-year-old female with nonischemic dilated cardiomyopathy, chronic heart failure with reduced ejection fraction, and hypertension. Diagnosed in 2023 after months of dyspnea; " +
        "cardiac catheterization in 2023 showed normal coronary arteries. NYHA class II: breathless after two flights of stairs. No orthopnea, edema or hospitalizations this year.",
      ros: "Cardiovascular: no chest pain, palpitations or edema. Respiratory: dyspnea only with heavy exertion. Constitutional: energy improved.",
      physical_exam:
        "BP 122/74, HR 64, weight 152 lb (stable). JVP not elevated. Lungs: clear. Heart: regular rate and rhythm, no S3, no murmur. Extremities: no edema.",
      medications:
        "Sacubitril/valsartan 97/103 mg twice daily\nCarvedilol 25 mg twice daily\nSpironolactone 25 mg daily\nDapagliflozin 10 mg daily\nFurosemide 20 mg as needed",
      labs:
        "Echocardiogram 01/2025: LVEF 35% (30% in 2023), LV end-diastolic diameter 6.2 cm\nNT-proBNP 620 pg/mL\nPotassium 4.4 mmol/L\nCreatinine 0.9 mg/dL; eGFR 66 mL/min/1.73m²",
      assessment_plan:
        "1. Chronic systolic (congestive) heart failure, NYHA II, stable on guideline-directed therapy. Continue sacubitril/valsartan, carvedilol, spironolactone and dapagliflozin; " +
        "furosemide only for weight gain over 3 lb.\n" +
        "2. Nonischemic dilated cardiomyopathy, EF improving from 30% to 35%. Repeat echocardiogram in 6 months; ICD not indicated at present.\n" +
        "3. Hypertensive heart disease with heart failure; BP at goal on the regimen above.",
      signature: "Electronically signed by Rafael Domingo, MD on 02/26/2025 at 15:45.",
    },
    key: [
      {
        code: "I11.0",
        required: true,
        excerpt: "Hypertensive heart disease with heart failure",
        rationale: "Hypertension with heart failure is presumed linked and is stated. Sequence I11.0 with the heart failure type. Maps to HCC226.",
        trap: "none",
      },
      {
        code: "I50.22",
        required: true,
        excerpt: "Chronic systolic (congestive) heart failure, NYHA II",
        rationale: "Type (systolic) and acuity (chronic) documented. Maps to HCC226.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "I42.0",
        required: true,
        excerpt: "Nonischemic dilated cardiomyopathy",
        rationale: "Documented and monitored. Maps to HCC227, which heart failure (HCC226) trims; it is still part of complete coding.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "I50.9",
        whyWrong: "The type and acuity are documented (chronic systolic). Unspecified heart failure is less specific than the record.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "I25.5",
        whyWrong: "Catheterization showed normal coronaries and the provider calls the cardiomyopathy nonischemic. Ischemic cardiomyopathy misstates the cause.",
        trap: "unsupported_linkage",
      },
      {
        code: "I10",
        whyWrong: "With heart failure present, ICD-10-CM presumes the link to hypertension: I11.0 replaces I10.",
        trap: "none",
      },
    ],
    expected: { hccs: [226], trimmed: [227], raf: 0.36 },
  },

  {
    id: "00000000-0000-4000-8000-000000000114",
    title: "Stable angina, claudication and persistent atrial fibrillation",
    specialty: "Cardiology",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-04-15",
    patient: { name: "Leopold Fairweather", dob: "1955-12-03", sex: "male", mrn: "SYN-440302" },
    provider: "Rafael Domingo, MD",
    facility: "Bayview Heart Institute",
    sections: {
      hpi:
        "69-year-old male with coronary artery disease (drug-eluting stent to the LAD in 2020), persistent atrial fibrillation and peripheral artery disease. " +
        "Chest tightness when walking uphill in cold air, relieved within 2 minutes by rest or one nitroglycerin; the same pattern for a year, with no rest pain and no increase in frequency. " +
        "Calf cramping in both legs after about two blocks, gone with rest; no foot sores or rest pain. A scanned letter from an outside cardiology practice, unsigned and undated, " +
        "describes 'ischemic cardiomyopathy, EF 30%'.",
      ros: "Cardiovascular: exertional chest tightness and calf pain as above; no palpitations or syncope. Respiratory: no dyspnea at rest. Skin: no leg wounds.",
      physical_exam:
        "BP 136/78, HR 72 irregularly irregular. Lungs: clear. Heart: irregular, no murmur. Femoral pulses 2+, popliteal 1+, dorsalis pedis and posterior tibial pulses diminished bilaterally. " +
        "Feet warm, skin intact, no ulcers.",
      medications:
        "Apixaban 5 mg twice daily\nMetoprolol succinate 100 mg daily\nIsosorbide mononitrate 30 mg daily\nNitroglycerin 0.4 mg sublingual as needed\nRosuvastatin 40 mg daily\nCilostazol 100 mg twice daily",
      labs: "Echocardiogram 03/2025: LVEF 55%, normal wall motion\nAnkle-brachial index 03/2025: right 0.68, left 0.72\nLDL 61 mg/dL",
      assessment_plan:
        "1. Coronary artery disease of native coronary artery with stable exertional angina. Pattern unchanged for a year; not unstable. Continue isosorbide mononitrate, metoprolol and rosuvastatin; " +
        "nitroglycerin as needed.\n" +
        "2. Atherosclerosis of native arteries of both legs with intermittent claudication. ABI 0.68 and 0.72, no tissue loss. Supervised exercise program; continue cilostazol and statin.\n" +
        "3. Persistent atrial fibrillation, rate controlled. Continue metoprolol and apixaban.\n" +
        "4. Presence of coronary stent (LAD, 2020).\n" +
        "5. The outside letter's 'ischemic cardiomyopathy, EF 30%' is not confirmed: echocardiogram 03/2025 shows LVEF 55% with normal wall motion. No cardiomyopathy.",
      signature: "Electronically signed by Rafael Domingo, MD on 04/15/2025 at 11:58.",
    },
    key: [
      {
        code: "I25.118",
        required: true,
        excerpt: "Coronary artery disease of native coronary artery with stable exertional angina",
        rationale:
          "Stable angina with CAD takes the combination code for 'other forms of angina'. V28 removed stable angina from the model: no HCC. Only unstable angina (HCC229) counts.",
        trap: "none",
      },
      {
        code: "I70.213",
        required: true,
        excerpt: "Atherosclerosis of native arteries of both legs with intermittent claudication",
        rationale: "Bilateral claudication, documented and treated. V28 dropped claudication-only atherosclerosis: no HCC. Ulceration or gangrene would map to HCC263.",
        trap: "none",
      },
      {
        code: "I48.19",
        required: true,
        excerpt: "Persistent atrial fibrillation, rate controlled",
        rationale: "Type documented and managed. Maps to HCC238.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "Z95.5",
        required: false,
        excerpt: "Presence of coronary stent (LAD, 2020)",
        rationale: "Reportable status. Optional for scoring; no HCC.",
        trap: "none",
      },
      {
        code: "Z79.01",
        required: false,
        excerpt: "Continue metoprolol and apixaban",
        rationale: "Long-term anticoagulant use. Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "I25.110",
        whyWrong: "The angina is explicitly stable and unchanged. Unstable angina would add an unsupported HCC229.",
        trap: "missing_acuity",
      },
      {
        code: "I70.233",
        whyWrong: "The feet are intact with no ulcers. Atherosclerosis with ulceration would add an unsupported HCC263.",
        trap: "none",
      },
      {
        code: "I42.9",
        whyWrong:
          "The only source is an unsigned, undated outside letter, and the provider refutes it with a current echo (EF 55%). It cannot be coded; it would add HCC227.",
        trap: "signature_or_date_missing",
      },
      {
        code: "I48.91",
        whyWrong: "Persistent AF is documented; unspecified AF is less specific (same HCC238).",
        trap: "unspecified_when_specific_exists",
      },
    ],
    expected: { hccs: [238], trimmed: [], raf: 0.299 },
  },

  {
    id: "00000000-0000-4000-8000-000000000115",
    title: "Advanced heart failure clinic visit",
    specialty: "Cardiology",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-07-29",
    patient: { name: "Cornelius Ravensworth", dob: "1959-03-21", sex: "male", mrn: "SYN-440458" },
    provider: "Ingrid Solberg, MD",
    facility: "Bayview Heart Institute, Advanced Heart Failure Program",
    sections: {
      hpi:
        "66-year-old male with idiopathic dilated cardiomyopathy, end-stage heart failure with reduced ejection fraction, hypertension and stage 4 chronic kidney disease, " +
        "seen in the advanced heart failure clinic. Short of breath dressing and walking across a room; two heart failure admissions in the past 6 months, the last discharge 06/2025. " +
        "Weight stable since discharge. ICD placed in 2022, no shocks. He is being evaluated for a left ventricular assist device; the evaluation is in progress and no device has been implanted.",
      ros: "Cardiovascular: dyspnea with minimal exertion, two-pillow orthopnea, no chest pain or syncope. GI: early satiety. Constitutional: fatigue.",
      physical_exam:
        "BP 94/62, HR 78, RR 18, SpO2 95% on room air, weight 176 lb (175 lb at discharge). JVP 9 cm. Lungs: clear. Heart: S3 gallop, soft holosystolic murmur at the apex. " +
        "Abdomen: no ascites. Extremities: cool, trace edema.",
      medications:
        "Furosemide 80 mg twice daily\nHydralazine 25 mg three times daily\nIsosorbide dinitrate 20 mg three times daily\nCarvedilol 3.125 mg twice daily\nEmpagliflozin 10 mg daily",
      labs:
        "Echocardiogram 06/2025: LVEF 15%, severe LV dilation, moderate mitral regurgitation\nCardiopulmonary exercise test 07/2025: peak VO2 11 mL/kg/min\nNT-proBNP 5,840 pg/mL\n" +
        "Sodium 132 mmol/L\nCreatinine 2.6 mg/dL; eGFR 24 mL/min/1.73m²",
      assessment_plan:
        "1. End stage heart failure, chronic systolic, NYHA IIIb-IV with peak VO2 11. Volume near baseline; continue furosemide 80 mg twice daily and hydralazine/isosorbide dinitrate; " +
        "carvedilol continued at low dose. Advanced therapies (LVAD) evaluation in progress; palliative care and social work consults placed.\n" +
        "2. Dilated cardiomyopathy, idiopathic, LVEF 15%.\n" +
        "3. Hypertensive heart and chronic kidney disease with heart failure and stage 4 CKD. eGFR 24; sacubitril/valsartan was stopped earlier this year for hypotension and " +
        "worsening renal function. Nephrology co-management; BMP weekly.\n" +
        "4. Presence of automatic implantable cardiac defibrillator, functioning normally on interrogation today.",
      signature: "Electronically signed by Ingrid Solberg, MD on 07/29/2025 at 17:20.",
    },
    key: [
      {
        code: "I50.84",
        required: true,
        excerpt: "End stage heart failure",
        rationale: "The provider documents end-stage heart failure with supporting data (peak VO2 11, LVAD evaluation). Maps to HCC222, the top of the HF hierarchy here.",
        trap: "none",
      },
      {
        code: "I50.22",
        required: true,
        excerpt: "chronic systolic",
        rationale: "I50.84 instructs to also code the type of heart failure. HCC226, trimmed by HCC222.",
        trap: "none",
      },
      {
        code: "I42.0",
        required: true,
        excerpt: "Dilated cardiomyopathy, idiopathic, LVEF 15%",
        rationale: "Documented. HCC227, trimmed by HCC222.",
        trap: "none",
      },
      {
        code: "I13.0",
        required: true,
        excerpt: "Hypertensive heart and chronic kidney disease with heart failure and stage 4 CKD",
        rationale: "Hypertension, heart failure and CKD stage 1-4 together take I13.0. HCC226, trimmed by HCC222.",
        trap: "none",
      },
      {
        code: "N18.4",
        required: true,
        excerpt: "stage 4 CKD. eGFR 24",
        rationale: "Stage documented and co-managed. Maps to HCC327 (a separate hierarchy from heart failure).",
        trap: "none",
      },
      {
        code: "Z95.810",
        required: false,
        excerpt: "Presence of automatic implantable cardiac defibrillator",
        rationale: "Reportable status. Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "Z95.811",
        whyWrong: "The LVAD is being evaluated; no device has been implanted. Heart assist device status would add an unsupported HCC223.",
        trap: "none",
      },
      {
        code: "I50.23",
        whyWrong: "Volume is near baseline and weight is stable since discharge; no acute decompensation is documented today.",
        trap: "missing_acuity",
      },
      {
        code: "I12.9",
        whyWrong: "With heart failure present, hypertensive CKD becomes hypertensive heart and CKD: I13.0, not I12.9.",
        trap: "none",
      },
    ],
    expected: { hccs: [222, 327], trimmed: [226, 227], raf: 3.019 },
  },

  // --- Endocrinology ---------------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000116",
    title: "Type 1 diabetes on an insulin pump",
    specialty: "Endocrinology",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-03-04",
    patient: { name: "Philippa Northcote", dob: "1958-06-14", sex: "female", mrn: "SYN-450126" },
    provider: "Kenji Watanabe-Ross, MD",
    facility: "Clearwater Endocrine Associates",
    sections: {
      hpi:
        "66-year-old female with type 1 diabetes since age 12, on an insulin pump with a continuous glucose monitor, and Hashimoto's thyroiditis. " +
        "CGM shows 52% time in range over 14 days (goal over 70%), with post-dinner highs up to 320 mg/dL; 1% time below range. " +
        "She has been underestimating dinner carbohydrates since starting a new job.",
      ros: "Constitutional: no weight change. Endocrine: thirst after dinner highs; no hypoglycemia symptoms. Eyes: no vision change.",
      physical_exam: "BP 118/70, HR 70, BMI 23.5. Thyroid: small and firm, no nodules. Pump site on the left abdomen clean. Feet: normal monofilament, pulses 2+.",
      medications: "Insulin lispro via insulin pump (basal 0.8 units/h; carbohydrate ratio 1:12)\nLevothyroxine 88 mcg daily",
      labs: "HbA1c 8.6%\nTSH 2.4 mIU/L\nUrine albumin-to-creatinine ratio 9 mg/g; eGFR 92 mL/min/1.73m²\nDilated eye exam 01/2025: no retinopathy",
      assessment_plan:
        "1. Type 1 diabetes mellitus with hyperglycemia. A1c 8.6% with post-dinner highs. Dinner carbohydrate ratio changed to 1:10; carbohydrate counting reviewed with the diabetes educator; " +
        "CGM download in 2 weeks.\n" +
        "2. Insulin pump in place and functioning; site rotation reviewed.\n" +
        "3. Hashimoto's thyroiditis with hypothyroidism, euthyroid on levothyroxine 88 mcg. Continue.",
      signature: "Electronically signed by Kenji Watanabe-Ross, MD on 03/04/2025 at 10:25.",
    },
    key: [
      {
        code: "E10.65",
        required: true,
        excerpt: "Type 1 diabetes mellitus with hyperglycemia",
        rationale: "Type and hyperglycemia documented, with treatment changes. Maps to HCC38.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "Z96.41",
        required: false,
        excerpt: "Insulin pump in place and functioning",
        rationale: "Reportable device status. Optional for scoring; no HCC.",
        trap: "none",
      },
      {
        code: "E06.3",
        required: true,
        excerpt: "Hashimoto's thyroiditis",
        rationale: "Autoimmune thyroiditis, treated. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "Z79.4",
        whyWrong: "ICD-10-CM guidelines say not to assign Z79.4 with type 1 diabetes: insulin use is inherent to the diagnosis.",
        trap: "none",
      },
      {
        code: "E10.9",
        whyWrong: "Hyperglycemia is documented and treated. 'Without complications' drops it (same HCC38).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "E11.65",
        whyWrong: "The provider documents type 1 diabetes since childhood. A type 2 code misstates the diagnosis.",
        trap: "none",
      },
    ],
    expected: { hccs: [38], trimmed: [], raf: 0.166 },
  },

  {
    id: "00000000-0000-4000-8000-000000000117",
    title: "Addison disease and severe obesity",
    specialty: "Endocrinology",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-06-10",
    patient: { name: "Rosalie Gutierrez-Platt", dob: "1967-01-29", sex: "female", mrn: "SYN-450289" },
    provider: "Kenji Watanabe-Ross, MD",
    facility: "Clearwater Endocrine Associates",
    sections: {
      hpi:
        "58-year-old female with primary adrenal insufficiency (autoimmune Addison's disease, diagnosed 2019), morbid obesity and obstructive sleep apnea, here for routine follow-up. " +
        "No adrenal crisis this year; used stress dosing once for a dental procedure. Energy good. Interested in weight-loss medication; weight has been 280-290 lb for 3 years despite dietary changes.",
      ros: "Constitutional: stable energy, no weight loss. GI: no nausea, vomiting or abdominal pain. Neurologic: no lightheadedness on standing. Sleep: uses CPAP nightly.",
      physical_exam:
        "BP 124/78 seated, 122/76 standing, HR 76, weight 287 lb, BMI 46.3. Mild hyperpigmentation of the palmar creases and gums, unchanged. No striae or dorsocervical fat pad.",
      medications: "Hydrocortisone 15 mg in the morning and 5 mg early afternoon\nFludrocortisone 0.1 mg daily\nCPAP nightly",
      labs: "Sodium 138 mmol/L\nPotassium 4.3 mmol/L\nPlasma renin activity 2.1 ng/mL/h\nHbA1c 5.6%",
      assessment_plan:
        "1. Primary adrenocortical insufficiency (Addison's disease), stable. Continue hydrocortisone 15/5 mg and fludrocortisone 0.1 mg; sick-day rules and emergency injection kit reviewed; " +
        "medical alert bracelet confirmed.\n" +
        "2. Morbid obesity, BMI 46.3. Start semaglutide 0.25 mg weekly with monthly titration; dietitian referral; bariatric surgery options discussed.\n" +
        "3. Obstructive sleep apnea, adherent to CPAP; continue.",
      signature: "Electronically signed by Kenji Watanabe-Ross, MD on 06/10/2025 at 14:05.",
    },
    key: [
      {
        code: "E27.1",
        required: true,
        excerpt: "Primary adrenocortical insufficiency (Addison's disease), stable",
        rationale: "Documented and treated (replacement therapy, sick-day plan). Maps to HCC51.",
        trap: "none",
      },
      {
        code: "E66.01",
        required: true,
        excerpt: "Morbid obesity, BMI 46.3",
        rationale: "Morbid obesity indexes to E66.01. Diagnosed and treated today. Maps to HCC48.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "Z68.42",
        required: true,
        excerpt: "BMI 46.3",
        rationale: "BMI 45.0-49.9 with the provider's obesity diagnosis. Also HCC48, counted once.",
        trap: "none",
      },
      {
        code: "G47.33",
        required: true,
        excerpt: "Obstructive sleep apnea, adherent to CPAP",
        rationale: "Assessed and treated. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "E27.2",
        whyWrong: "No crisis this year and stable today. Addisonian crisis overstates the acuity.",
        trap: "missing_acuity",
      },
      {
        code: "E24.9",
        whyWrong: "No Cushing's syndrome is diagnosed; the exam specifically notes no striae or fat pad. Steroid replacement for Addison's is not Cushing's.",
        trap: "none",
      },
      {
        code: "E66.9",
        whyWrong: "Morbid obesity is documented. Unspecified obesity carries no HCC in V28 and loses the severity.",
        trap: "unspecified_when_specific_exists",
      },
    ],
    expected: { hccs: [48, 51], trimmed: [], raf: 0.696 },
  },

  {
    id: "00000000-0000-4000-8000-000000000118",
    title: "Diabetes with eye, kidney and nerve complications",
    specialty: "Endocrinology",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-10-08",
    patient: { name: "Bartholomew Nwankwo", dob: "1952-04-16", sex: "male", mrn: "SYN-450417" },
    provider: "Kenji Watanabe-Ross, MD",
    facility: "Clearwater Endocrine Associates",
    sections: {
      hpi:
        "73-year-old male with type 2 diabetes for 25 years on basal-bolus insulin, referred back by ophthalmology and nephrology. Ophthalmology note 09/2025: proliferative diabetic retinopathy " +
        "in both eyes, treated with panretinal photocoagulation in 2024, now stable, no macular edema. Two hypoglycemic episodes this month (CGM lows of 52 and 48 mg/dL) after skipping lunch, " +
        "treated with juice; no loss of consciousness and no assistance needed. Tingling and numbness in both feet up to the ankles.",
      ros: "Eyes: stable vision with glasses. Neurologic: numbness and tingling in both feet. Endocrine: shakiness and sweating with the two lows, none since.",
      physical_exam:
        "BP 138/76, HR 72, BMI 29. Monofilament sensation absent at all sites on both feet; vibration reduced at both great toes; ankle reflexes absent. Feet intact, no ulcers.",
      medications:
        "Insulin degludec 28 units daily\nInsulin aspart 6 units with meals\nDuloxetine 60 mg daily\nLosartan 100 mg daily\nAtorvastatin 40 mg daily",
      labs:
        "HbA1c 7.0%\neGFR 27 mL/min/1.73m² (31 in 04/2025)\nUrine albumin-to-creatinine ratio 820 mg/g\nCGM 14 days: 6% of time below 70 mg/dL",
      assessment_plan:
        "1. Type 2 diabetes with stable proliferative diabetic retinopathy, both eyes, without macular edema, status post panretinal photocoagulation. Ophthalmology follow-up every 4 months.\n" +
        "2. Type 2 diabetes with diabetic chronic kidney disease, stage 4. eGFR 27, UACR 820. Continue losartan; nephrology following; metformin remains stopped.\n" +
        "3. Type 2 diabetes with diabetic polyneuropathy. Continue duloxetine; podiatry every 3 months.\n" +
        "4. Type 2 diabetes with hypoglycemia without coma. Lows after skipped meals: reduce aspart to 4 units and skip the dose when a meal is skipped; glucagon prescribed.\n" +
        "5. Long-term current use of insulin.",
      signature: "Electronically signed by Kenji Watanabe-Ross, MD on 10/08/2025 at 09:50.",
    },
    key: [
      {
        code: "E11.3553",
        required: true,
        excerpt: "Type 2 diabetes with stable proliferative diabetic retinopathy, both eyes",
        rationale:
          "Type, stage (stable proliferative), macular edema status and laterality are all documented. Maps to HCC37 and HCC298 (severe diabetic eye disease).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "E11.22",
        required: true,
        excerpt: "Type 2 diabetes with diabetic chronic kidney disease, stage 4",
        rationale: "Linked and managed. HCC37.",
        trap: "none",
      },
      {
        code: "N18.4",
        required: true,
        excerpt: "stage 4. eGFR 27",
        rationale: "Stage 4 documented. Maps to HCC327.",
        trap: "none",
      },
      {
        code: "E11.42",
        required: true,
        excerpt: "Type 2 diabetes with diabetic polyneuropathy",
        rationale: "Linked, examined and treated. HCC37.",
        trap: "none",
      },
      {
        code: "E11.649",
        required: true,
        excerpt: "Type 2 diabetes with hypoglycemia without coma",
        rationale: "Documented and treated. Maps to HCC38, which HCC37 trims; still coded.",
        trap: "none",
      },
      {
        code: "Z79.4",
        required: true,
        excerpt: "Long-term current use of insulin",
        rationale: "Long-term insulin with type 2 diabetes. HCC38, trimmed.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "E11.319",
        whyWrong: "The retinopathy stage is documented (stable proliferative). Unspecified retinopathy maps only to HCC37 and loses HCC298.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "E11.641",
        whyWrong: "No loss of consciousness or coma is documented. Hypoglycemia with coma would add an unsupported HCC36.",
        trap: "missing_acuity",
      },
      {
        code: "N18.30",
        whyWrong: "eGFR 27 is stage 4, as documented. A stage 3 code is wrong and drops the HCC from 327 to 329.",
        trap: "none",
      },
    ],
    expected: { hccs: [37, 298, 327], trimmed: [38], raf: 1.016 },
  },

  // --- Nephrology ------------------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000119",
    title: "Chronic kidney disease stage 3b with anemia",
    specialty: "Nephrology",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-01-14",
    patient: { name: "Agatha Pemberton-Soule", dob: "1948-09-02", sex: "female", mrn: "SYN-460133" },
    provider: "Tobias Lindgren, MD",
    facility: "Riverside Kidney Care",
    sections: {
      hpi:
        "76-year-old female with chronic kidney disease from hypertensive nephrosclerosis, referred for rising creatinine and anemia. Fatigue for 2 months; no melena, hematuria or other blood loss. " +
        "Past history includes rheumatoid arthritis, followed by an outside rheumatologist.",
      ros: "Constitutional: fatigue. Cardiovascular: no edema or chest pain. Genitourinary: no hematuria or foamy urine. GI: no black stools.",
      physical_exam: "BP 146/84, HR 74, BMI 25. Conjunctival pallor. Lungs: clear. Heart: regular. Extremities: no edema.",
      medications: "Amlodipine 10 mg daily\nLosartan 25 mg daily (new)",
      labs:
        "Creatinine 1.5 mg/dL (1.2 in 2024)\neGFR 36 mL/min/1.73m²\nUrine albumin-to-creatinine ratio 45 mg/g\n" +
        "Hemoglobin 9.8 g/dL; ferritin 210 ng/mL; transferrin saturation 24%; B12 and folate normal\nRenal ultrasound 12/2024: small echogenic kidneys, no obstruction",
      assessment_plan:
        "1. Chronic kidney disease, stage 3b, due to hypertensive nephrosclerosis. eGFR 36. Start losartan 25 mg; BMP in 2 weeks; low-sodium diet; avoid NSAIDs.\n" +
        "2. Anemia in chronic kidney disease. Iron studies adequate; no bleeding source suspected. Recheck hemoglobin in 6 weeks; consider an erythropoiesis-stimulating agent if below 9.",
      signature: "Electronically signed by Tobias Lindgren, MD on 01/14/2025 at 15:15.",
    },
    key: [
      {
        code: "N18.32",
        required: true,
        excerpt: "Chronic kidney disease, stage 3b",
        rationale: "Stage 3b documented (eGFR 30-44) and treated. Maps to HCC328.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "I12.9",
        required: true,
        excerpt: "due to hypertensive nephrosclerosis",
        rationale: "Hypertensive CKD, stated. Code I12.9 with the stage. No HCC.",
        trap: "none",
      },
      {
        code: "D63.1",
        required: true,
        excerpt: "Anemia in chronic kidney disease",
        rationale: "The provider attributes the anemia to CKD after excluding other causes. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "N18.31",
        whyWrong: "eGFR 36 is stage 3b (30-44), as documented; stage 3a is 45-59.",
        trap: "none",
      },
      {
        code: "D64.9",
        whyWrong: "The cause is documented (anemia in CKD). Unspecified anemia is less specific than the record.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "M06.9",
        whyWrong:
          "Rheumatoid arthritis appears only in the past history. It is not evaluated, assessed or treated at this visit, so there is no support (MEAT) to code it; it would add HCC93.",
        trap: "no_treatment_documented",
      },
    ],
    expected: { hccs: [328], trimmed: [], raf: 0.127 },
  },

  {
    id: "00000000-0000-4000-8000-000000000120",
    title: "Kidney transplant follow-up",
    specialty: "Nephrology",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-08-19",
    patient: { name: "Ezekiel Marchetti", dob: "1958-02-11", sex: "male", mrn: "SYN-460276" },
    provider: "Tobias Lindgren, MD",
    facility: "Riverside Kidney Care, Transplant Clinic",
    sections: {
      hpi:
        "67-year-old male, 4 years after a deceased-donor kidney transplant (2021) for end-stage renal disease from IgA nephropathy. On hemodialysis 2017-2021; no dialysis since the transplant. " +
        "Feels well. No fever, dysuria, graft tenderness or decreased urine output.",
      ros: "Constitutional: no fever or weight change. Genitourinary: normal urine output, no dysuria. Cardiovascular: no edema.",
      physical_exam: "BP 132/78, HR 72, BMI 26. Allograft in the right lower quadrant nontender, no bruit. Extremities: no edema.",
      medications: "Tacrolimus 2 mg twice daily\nMycophenolate mofetil 500 mg twice daily\nPrednisone 5 mg daily\nAmlodipine 5 mg daily",
      labs:
        "Creatinine 1.3 mg/dL (stable 1.2-1.4 over the past year)\neGFR 55 mL/min/1.73m²\nTacrolimus trough 6.1 ng/mL (target 5-8)\n" +
        "Urine albumin-to-creatinine ratio 30 mg/g\nBK virus PCR negative",
      assessment_plan:
        "1. Kidney transplant status, stable graft function. No signs of rejection or infection. Continue tacrolimus, mycophenolate and prednisone; trough at goal.\n" +
        "2. Chronic kidney disease stage 3a in the transplanted kidney. eGFR 55, the stable baseline for this graft. Labs every 2 months.\n" +
        "3. Hypertension with CKD, controlled on amlodipine.\n" +
        "4. Long-term immunosuppression with tacrolimus and mycophenolate; monitoring as above.",
      signature: "Electronically signed by Tobias Lindgren, MD on 08/19/2025 at 13:40.",
    },
    key: [
      {
        code: "Z94.0",
        required: true,
        excerpt: "Kidney transplant status, stable graft function",
        rationale: "Transplant status with no complication documented. In V28, kidney transplant status carries no HCC.",
        trap: "none",
      },
      {
        code: "N18.31",
        required: true,
        excerpt: "Chronic kidney disease stage 3a in the transplanted kidney",
        rationale:
          "CKD in a transplant recipient is coded with N18.- and Z94.0. It is a transplant complication only if the provider says so. Maps to HCC329.",
        trap: "unsupported_linkage",
      },
      {
        code: "I12.9",
        required: true,
        excerpt: "Hypertension with CKD, controlled on amlodipine",
        rationale: "Hypertension with CKD is presumed linked. No HCC.",
        trap: "none",
      },
      {
        code: "Z79.621",
        required: false,
        excerpt: "Long-term immunosuppression with tacrolimus",
        rationale: "Tacrolimus is a calcineurin inhibitor. Optional for scoring; no HCC.",
        trap: "none",
      },
      {
        code: "Z79.69",
        required: false,
        excerpt: "mycophenolate",
        rationale: "Other long-term immunosuppressant. Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "T86.11",
        whyWrong: "The provider documents no rejection. Stable CKD in a graft is not a transplant complication unless the provider links it.",
        trap: "unsupported_linkage",
      },
      {
        code: "N18.6",
        whyWrong: "ESRD ended with the 2021 transplant. ESRD would add an unsupported HCC326.",
        trap: "status_vs_history",
      },
      {
        code: "Z99.2",
        whyWrong: "He has not been on dialysis since 2021.",
        trap: "status_vs_history",
      },
    ],
    expected: { hccs: [329], trimmed: [], raf: 0.127 },
  },

  {
    id: "00000000-0000-4000-8000-000000000121",
    title: "Stage 5 kidney disease preparing for dialysis",
    specialty: "Nephrology",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-10-28",
    patient: { name: "Henrietta Oyelaran", dob: "1953-06-30", sex: "female", mrn: "SYN-460419" },
    provider: "Miriam Feldstein, MD",
    facility: "Riverside Kidney Care",
    sections: {
      hpi:
        "72-year-old female with type 2 diabetes, diabetic kidney disease and hypertension, seen in CKD clinic. A left radiocephalic arteriovenous fistula was created in 08/2025 and is maturing; " +
        "she has not started dialysis. Mild morning nausea and itching; appetite fair. No dyspnea, confusion or edema.",
      ros: "GI: mild morning nausea, no vomiting. Skin: generalized itching. Respiratory: no dyspnea. Neurologic: no confusion or asterixis reported.",
      physical_exam:
        "BP 152/86, HR 80, weight 164 lb. Left forearm arteriovenous fistula with palpable thrill and audible bruit. Lungs: clear. Trace ankle edema. Excoriations on both forearms.",
      medications:
        "Insulin glargine 14 units nightly\nCarvedilol 12.5 mg twice daily\nFurosemide 40 mg daily\nCalcitriol 0.25 mcg daily\nSevelamer 800 mg three times daily with meals\n" +
        "Sodium bicarbonate 650 mg twice daily\nDarbepoetin alfa 40 mcg every 2 weeks",
      labs:
        "eGFR 12 mL/min/1.73m² (15 in 07/2025)\nCreatinine 4.1 mg/dL; BUN 68 mg/dL\nPotassium 5.2 mmol/L; bicarbonate 19 mmol/L\nPhosphorus 5.6 mg/dL; calcium 8.8 mg/dL; PTH 412 pg/mL\n" +
        "Hemoglobin 10.1 g/dL\nHbA1c 6.9%",
      assessment_plan:
        "1. Type 2 diabetes with diabetic chronic kidney disease, stage 5, not on dialysis. eGFR 12 with mild uremic symptoms. Fistula maturing; plan to start hemodialysis when symptoms progress " +
        "or eGFR falls below 10; transplant referral sent; dietitian for potassium and phosphorus restriction.\n" +
        "2. Hypertensive chronic kidney disease with stage 5 CKD. BP above goal; increase carvedilol to 25 mg twice daily.\n" +
        "3. Secondary hyperparathyroidism of renal origin. PTH 412, phosphorus 5.6; continue calcitriol and sevelamer.\n" +
        "4. Anemia in chronic kidney disease, hemoglobin 10.1 on darbepoetin; continue.\n" +
        "5. Long-term current use of insulin; glargine 14 units, A1c 6.9%.",
      signature: "Electronically signed by Miriam Feldstein, MD on 10/28/2025 at 16:55.",
    },
    key: [
      {
        code: "E11.22",
        required: true,
        excerpt: "Type 2 diabetes with diabetic chronic kidney disease, stage 5",
        rationale: "Linked and managed. HCC37.",
        trap: "none",
      },
      {
        code: "N18.5",
        required: true,
        excerpt: "stage 5, not on dialysis",
        rationale: "Stage 5 is documented and she is not on dialysis, so N18.5 rather than N18.6. Maps to HCC326.",
        trap: "status_vs_history",
      },
      {
        code: "I12.0",
        required: true,
        excerpt: "Hypertensive chronic kidney disease with stage 5 CKD",
        rationale: "Hypertensive CKD with stage 5 takes I12.0 (not I12.9). Also HCC326.",
        trap: "none",
      },
      {
        code: "N25.81",
        required: true,
        excerpt: "Secondary hyperparathyroidism of renal origin",
        rationale: "Documented and treated. No HCC.",
        trap: "none",
      },
      {
        code: "D63.1",
        required: true,
        excerpt: "Anemia in chronic kidney disease, hemoglobin 10.1 on darbepoetin",
        rationale: "Documented and treated. No HCC.",
        trap: "none",
      },
      {
        code: "Z79.4",
        required: true,
        excerpt: "Long-term current use of insulin",
        rationale: "Long-term insulin with type 2 diabetes. HCC38, trimmed by HCC37.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "N18.6",
        whyWrong: "End-stage renal disease is not documented; the provider documents stage 5 not on dialysis. Same HCC326, but the code must match the record.",
        trap: "none",
      },
      {
        code: "Z99.2",
        whyWrong: "A maturing fistula is not dialysis. She has not started dialysis, so dependence on dialysis is unsupported.",
        trap: "status_vs_history",
      },
      {
        code: "I12.9",
        whyWrong: "I12.9 covers CKD stages 1-4 or unspecified. Stage 5 takes I12.0.",
        trap: "none",
      },
    ],
    expected: { hccs: [37, 326], trimmed: [38], raf: 0.981 },
  },
];

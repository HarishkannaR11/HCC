/**
 * Library charts: Family Medicine, Internal Medicine, Geriatrics.
 *
 * EVERY PERSON, DATE, MRN, PROVIDER AND FACILITY HERE IS INVENTED. Synthetic
 * teaching charts; no real patient record was used or consulted.
 */
import type { SeedChart } from "../types";

export const PRIMARY_CARE_CHARTS: SeedChart[] = [
  // --- Family Medicine -------------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000104",
    title: "Diabetes with hyperglycemia and severe obesity",
    specialty: "Family Medicine",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-02-18",
    patient: { name: "Harold Quimby", dob: "1956-08-09", sex: "male", mrn: "SYN-410221" },
    provider: "Lena Okafor, MD",
    facility: "Maple Grove Family Health",
    sections: {
      hpi:
        "68-year-old male with type 2 diabetes, obesity and hypertension returns for 3-month follow-up. Home fasting glucose readings have run 210-260 mg/dL " +
        "over the past month since he stopped his daily walks during a cold spell. Taking metformin 1000 mg twice daily with a few missed doses. " +
        "Weight up 6 lb since November. Denies vision change, chest pain or foot sores.",
      ros:
        "Constitutional: weight gain, no fever. Eyes: no blurred vision. Cardiovascular: no chest pain, no edema. Endocrine: mild thirst, nocturia once nightly. " +
        "Skin: no wounds on the feet.",
      physical_exam:
        "BP 138/84, HR 80, weight 298 lb, height 70 in, BMI 42.8. Heart: regular rate and rhythm. Lungs: clear. " +
        "Feet: skin intact, monofilament sensation normal bilaterally, dorsalis pedis pulses 2+.",
      medications: "Metformin 1000 mg twice daily\nLisinopril 20 mg daily",
      labs: "HbA1c 9.2% (7.8% in 11/2024)\nFasting glucose 238 mg/dL\neGFR 84 mL/min/1.73m²\nUrine albumin-to-creatinine ratio 18 mg/g",
      assessment_plan:
        "1. Type 2 diabetes mellitus with hyperglycemia. A1c 9.2%, up from 7.8%. Add semaglutide 0.25 mg weekly and titrate monthly; continue metformin; diabetes education referral.\n" +
        "2. Morbid obesity due to excess calories, BMI 42.8. Discussed a 500 kcal/day deficit and resuming a walking program; semaglutide should also help with weight; dietitian referral.\n" +
        "3. Essential hypertension, at goal on lisinopril. Continue.\n" +
        "4. Return in 3 months with A1c.",
      signature: "Electronically signed by Lena Okafor, MD on 02/18/2025 at 11:20.",
    },
    key: [
      {
        code: "E11.65",
        required: true,
        excerpt: "Type 2 diabetes mellitus with hyperglycemia",
        rationale: "The provider documents hyperglycemia (A1c 9.2%, fasting readings 210-260) and changes treatment. E11.65 maps to HCC38.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "E66.01",
        required: true,
        excerpt: "Morbid obesity due to excess calories, BMI 42.8",
        rationale: "Diagnosed by the provider and managed (diet plan, dietitian, medication). Morbid obesity maps to HCC48.",
        trap: "none",
      },
      {
        code: "Z68.41",
        required: true,
        excerpt: "BMI 42.8",
        rationale: "A BMI code is reported with the provider-documented obesity diagnosis. BMI 40.0-44.9 also maps to HCC48, which counts once.",
        trap: "none",
      },
      {
        code: "I10",
        required: true,
        excerpt: "Essential hypertension, at goal on lisinopril",
        rationale: "Assessed and treated. No heart failure or CKD is documented, so I10 applies. No HCC in V28.",
        trap: "none",
      },
      {
        code: "Z79.84",
        required: false,
        excerpt: "continue metformin",
        rationale: "Long-term use of an oral hypoglycemic is reportable. Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "E11.9",
        whyWrong: "The note documents hyperglycemia and treats it. 'Without complications' ignores that. Same HCC38, but the code must match the record.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "E66.812",
        whyWrong: "BMI 42.8 is class 3, and the provider documents morbid obesity. Class 2 obesity (E66.812) carries no HCC in V28; morbid obesity does (HCC48).",
        trap: "unspecified_when_specific_exists",
      },
    ],
    expected: { hccs: [38, 48], trimmed: [], raf: 0.352 },
  },

  {
    id: "00000000-0000-4000-8000-000000000105",
    title: "Annual visit with a long problem list",
    specialty: "Family Medicine",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-06-24",
    patient: { name: "Margarethe Lindqvist", dob: "1950-11-03", sex: "female", mrn: "SYN-410388" },
    provider: "Daniel Osei, MD",
    facility: "Harbor Point Family Medicine",
    sections: {
      hpi:
        "74-year-old female for her annual chronic care visit. COPD: uses tiotropium daily and albuterol about twice a week; no flares, steroids or antibiotics this year; " +
        "walks her dog a mile daily with two rest stops. Sigmoid colon cancer treated with sigmoid colectomy in 2016, no chemotherapy; surveillance colonoscopy 03/2024 clear. " +
        "Pulmonary embolism in 2019 after knee replacement, treated with 6 months of apixaban, completed in 2020. Recurrent depression: two prior episodes, none since 2021; " +
        "remains on sertraline and feels well. A problem list imported from her previous clinic also lists 'CHF'; she has never been told she has heart failure and has never taken a diuretic.",
      ros:
        "Respiratory: chronic mild exertional dyspnea, unchanged; no wheeze today. Cardiovascular: no edema, orthopnea or PND. " +
        "GI: normal bowel habits, no bleeding. Psychiatric: mood good, sleeping well.",
      physical_exam:
        "BP 128/76, HR 72, SpO2 95% on room air, BMI 26.0. Lungs: prolonged expiration, no wheezes. Heart: regular rate and rhythm, no murmur, no JVD. " +
        "Abdomen: well-healed lower midline scar. Extremities: no edema.",
      medications: "Tiotropium 2.5 mcg, 2 inhalations daily\nAlbuterol HFA as needed\nSertraline 100 mg daily\nAtorvastatin 20 mg daily",
      labs: "Spirometry 05/2025: FEV1/FVC 0.62, FEV1 71% predicted\nEchocardiogram 05/2025: LVEF 60%, normal diastolic function\nPHQ-9: 2\nLDL 98 mg/dL",
      assessment_plan:
        "1. COPD, stable on tiotropium; no exacerbations this year. Continue tiotropium and albuterol as needed; influenza and RSV vaccines today.\n" +
        "2. Personal history of colon cancer, status post sigmoid colectomy 2016, no evidence of disease on 2024 colonoscopy. Next surveillance colonoscopy 2027.\n" +
        "3. History of pulmonary embolism (2019), anticoagulation completed in 2020. No current treatment; no symptoms of recurrence.\n" +
        "4. Major depressive disorder, recurrent, in full remission on sertraline. PHQ-9 2. Continue sertraline 100 mg.\n" +
        "5. 'CHF' on the imported problem list is not supported: normal echocardiogram 05/2025 and no symptoms. Removed from the problem list.\n" +
        "6. Hyperlipidemia on atorvastatin; continue.",
      signature: "Electronically signed by Daniel Osei, MD on 06/24/2025 at 10:05.",
    },
    key: [
      {
        code: "J44.9",
        required: true,
        excerpt: "COPD, stable on tiotropium; no exacerbations this year",
        rationale: "Assessed and treated, with no exacerbation documented, so J44.9. Maps to HCC280.",
        trap: "none",
      },
      {
        code: "Z85.038",
        required: true,
        excerpt: "Personal history of colon cancer, status post sigmoid colectomy 2016, no evidence of disease",
        rationale: "Treatment ended in 2016 and there is no current disease or treatment, so the history code applies. No HCC.",
        trap: "status_vs_history",
      },
      {
        code: "Z86.711",
        required: true,
        excerpt: "History of pulmonary embolism (2019), anticoagulation completed in 2020",
        rationale: "The embolism is resolved and anticoagulation ended. A personal history code, not an active PE code.",
        trap: "status_vs_history",
      },
      {
        code: "F33.42",
        required: true,
        excerpt: "Major depressive disorder, recurrent, in full remission on sertraline",
        rationale: "The provider documents full remission. In V28, MDD in remission carries no HCC; only moderate or severe episodes map to HCC155.",
        trap: "status_vs_history",
      },
      {
        code: "E78.5",
        required: true,
        excerpt: "Hyperlipidemia on atorvastatin",
        rationale: "Treated. No HCC in V28.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "C18.7",
        whyWrong: "Treated in 2016 with no current disease or treatment. Active colon cancer would add an unsupported HCC22.",
        trap: "status_vs_history",
      },
      {
        code: "I26.99",
        whyWrong: "The embolism resolved and treatment ended in 2020. An active PE code would add an unsupported HCC267.",
        trap: "status_vs_history",
      },
      {
        code: "F33.1",
        whyWrong: "The provider documents full remission. A current moderate episode would add an unsupported HCC155.",
        trap: "status_vs_history",
      },
      {
        code: "I50.9",
        whyWrong:
          "'CHF' appears only on an imported problem list that no provider authenticated, and today's provider evaluated and refuted it (normal echo). Would add HCC226.",
        trap: "signature_or_date_missing",
      },
    ],
    expected: { hccs: [280], trimmed: [], raf: 0.319 },
  },

  {
    id: "00000000-0000-4000-8000-000000000106",
    title: "Diabetic foot ulcer and kidney follow-up",
    specialty: "Family Medicine",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-08-05",
    patient: { name: "Rufus Abernathy", dob: "1954-01-27", sex: "male", mrn: "SYN-410517" },
    provider: "Lena Okafor, MD",
    facility: "Maple Grove Family Health",
    sections: {
      hpi:
        "71-year-old male with type 2 diabetes on insulin, diabetic kidney disease, diabetic polyneuropathy and hypertension, seen for a wound under the right forefoot " +
        "that his wife noticed 2 weeks ago. Right great toe amputated in 2022 for osteomyelitis. No fever or chills. Wears custom shoes most days.",
      ros:
        "Constitutional: no fever. Skin: wound right foot, minimal drainage. Neurologic: numbness in both feet, unchanged. Genitourinary: no change in urine output.",
      physical_exam:
        "BP 136/80, HR 78, temperature 98.2 F. Right foot: 1.5 x 1.2 cm ulcer at the plantar first metatarsal head with fat layer exposed, granular base, " +
        "no probe to bone, minimal serous drainage, no surrounding erythema. Absent right great toe, well healed. Monofilament sensation absent in both feet. " +
        "Dorsalis pedis pulses 2+ bilaterally.",
      medications:
        "Insulin glargine 30 units nightly\nInsulin lispro with meals per scale\nLosartan 50 mg daily\nAtorvastatin 40 mg daily\nGabapentin 300 mg three times daily",
      labs:
        "HbA1c 8.4%\neGFR 38 mL/min/1.73m² (40 in 02/2025)\nCreatinine 1.8 mg/dL\nUrine albumin-to-creatinine ratio 410 mg/g\nX-ray right foot 08/2025: no osteomyelitis",
      assessment_plan:
        "1. Type 2 diabetes with diabetic foot ulcer, right plantar forefoot, fat layer exposed. Neuropathic ulcer, no infection; x-ray negative for osteomyelitis. " +
        "Podiatry for debridement this week; offloading boot dispensed; daily saline dressing.\n" +
        "2. Type 2 diabetes with diabetic chronic kidney disease, stage 3b. eGFR 38, UACR 410. Continue losartan; nephrology referral; avoid NSAIDs.\n" +
        "3. Type 2 diabetes with diabetic polyneuropathy. Continue gabapentin; daily foot checks reinforced.\n" +
        "4. A1c 8.4% on basal-bolus insulin; increase glargine to 32 units.\n" +
        "5. Acquired absence of right great toe (2022). Custom insert adjusted to offload the ulcer.\n" +
        "6. Hypertension with CKD, controlled on losartan.",
      signature: "Electronically signed by Lena Okafor, MD on 08/05/2025 at 14:48.",
    },
    key: [
      {
        code: "E11.621",
        required: true,
        excerpt: "Type 2 diabetes with diabetic foot ulcer, right plantar forefoot",
        rationale: "The provider links the ulcer to diabetes. E11.621 maps to both HCC37 and HCC383; code the ulcer site and depth with L97.-.",
        trap: "none",
      },
      {
        code: "L97.512",
        required: true,
        excerpt: "fat layer exposed",
        rationale: "Plantar first metatarsal head is 'other part of foot' (L97.51-); depth is documented as fat layer exposed. Maps to HCC383.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "E11.22",
        required: true,
        excerpt: "Type 2 diabetes with diabetic chronic kidney disease, stage 3b",
        rationale: "Linked by the provider and managed. HCC37, which the foot ulcer code already carries.",
        trap: "none",
      },
      {
        code: "N18.32",
        required: true,
        excerpt: "stage 3b. eGFR 38",
        rationale: "Stage 3b is documented (eGFR 30-44). Maps to HCC328.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "E11.42",
        required: true,
        excerpt: "Type 2 diabetes with diabetic polyneuropathy",
        rationale: "Linked, examined (absent monofilament) and treated (gabapentin). HCC37 again; every documented complication is still coded.",
        trap: "none",
      },
      {
        code: "Z79.4",
        required: true,
        excerpt: "A1c 8.4% on basal-bolus insulin",
        rationale: "Long-term insulin with type 2 diabetes. Maps to HCC38, which HCC37 trims.",
        trap: "none",
      },
      {
        code: "Z89.411",
        required: true,
        excerpt: "Acquired absence of right great toe (2022)",
        rationale: "A great-toe amputation is reportable status but carries no HCC in V28; only leg-level amputations map to HCC409.",
        trap: "none",
      },
      {
        code: "I12.9",
        required: true,
        excerpt: "Hypertension with CKD, controlled on losartan",
        rationale: "Hypertension with CKD is presumed linked: I12.9 with the N18 stage. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "Z89.511",
        whyWrong: "Only the great toe was amputated. Below-knee amputation status would add an unsupported HCC409.",
        trap: "none",
      },
      {
        code: "N18.30",
        whyWrong: "Stage 3b is documented. The unspecified stage 3 code lands in HCC329 instead of HCC328 and loses the specificity the record supports.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "L97.519",
        whyWrong: "Depth is documented (fat layer exposed). Unspecified severity drops detail the record gives.",
        trap: "unspecified_when_specific_exists",
      },
    ],
    expected: { hccs: [37, 328, 383], trimmed: [38], raf: 0.939 },
  },

  // --- Internal Medicine -----------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000107",
    title: "Paroxysmal atrial fibrillation and kidney check",
    specialty: "Internal Medicine",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-03-11",
    patient: { name: "Beatrice Okonkwo-Hale", dob: "1954-09-30", sex: "female", mrn: "SYN-420144" },
    provider: "Arjun Mehta, MD",
    facility: "Northfield Internal Medicine",
    sections: {
      hpi:
        "70-year-old female with paroxysmal atrial fibrillation on apixaban, hypertension with chronic kidney disease, and hypothyroidism. " +
        "Two brief episodes of palpitations last month, each under an hour, self-terminated. No syncope, bleeding or chest pain.",
      ros: "Cardiovascular: intermittent palpitations as above, no chest pain or edema. Hematologic: no bruising or bleeding. Endocrine: no heat or cold intolerance.",
      physical_exam: "BP 134/82, HR 68 regular, BMI 27.5. Heart: regular rhythm, no murmur. Lungs: clear. Extremities: no edema.",
      medications: "Apixaban 5 mg twice daily\nMetoprolol succinate 50 mg daily\nAmlodipine 5 mg daily\nLevothyroxine 75 mcg daily",
      labs: "eGFR 54 mL/min/1.73m² (58 in 09/2024)\nCreatinine 1.1 mg/dL\nTSH 2.1 mIU/L\nHemoglobin 13.2 g/dL\nECG today: sinus rhythm, rate 66",
      assessment_plan:
        "1. Paroxysmal atrial fibrillation, in sinus rhythm today. Brief self-limited episodes; continue metoprolol and apixaban (CHA2DS2-VASc 3). " +
        "Apixaban stays at 5 mg twice daily (age under 80, creatinine under 1.5).\n" +
        "2. Chronic kidney disease stage 3a due to hypertension. eGFR 54, stable. Continue amlodipine; BMP in 6 months; avoid NSAIDs.\n" +
        "3. Hypothyroidism, TSH 2.1 on levothyroxine 75 mcg; continue.",
      signature: "Electronically signed by Arjun Mehta, MD on 03/11/2025 at 09:40.",
    },
    key: [
      {
        code: "I48.0",
        required: true,
        excerpt: "Paroxysmal atrial fibrillation, in sinus rhythm today",
        rationale: "The type (paroxysmal) is documented and the condition is managed. Sinus rhythm today does not remove the diagnosis. Maps to HCC238.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "N18.31",
        required: true,
        excerpt: "Chronic kidney disease stage 3a",
        rationale: "Stage 3a documented (eGFR 54) and monitored. Maps to HCC329.",
        trap: "none",
      },
      {
        code: "I12.9",
        required: true,
        excerpt: "due to hypertension",
        rationale: "Hypertension with CKD is coded as hypertensive CKD (I12.9) with the stage. No HCC.",
        trap: "none",
      },
      {
        code: "E03.9",
        required: true,
        excerpt: "Hypothyroidism, TSH 2.1 on levothyroxine",
        rationale: "Treated and monitored. No HCC.",
        trap: "none",
      },
      {
        code: "Z79.01",
        required: false,
        excerpt: "continue metoprolol and apixaban",
        rationale: "Long-term anticoagulant use is reportable. Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "I48.91",
        whyWrong: "Paroxysmal is documented. Unspecified AF also maps to HCC238 but is less specific than the record.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "N18.30",
        whyWrong: "Stage 3a is documented; the unspecified stage 3 code loses that specificity.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "I10",
        whyWrong: "With CKD present, ICD-10-CM presumes hypertension is linked to it, and here it is stated. I12.9 replaces I10.",
        trap: "none",
      },
    ],
    expected: { hccs: [238, 329], trimmed: [], raf: 0.426 },
  },

  {
    id: "00000000-0000-4000-8000-000000000108",
    title: "Hepatitis C cirrhosis before antiviral treatment",
    specialty: "Internal Medicine",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-05-14",
    patient: { name: "Curtis Vandermeer", dob: "1961-02-17", sex: "male", mrn: "SYN-420297" },
    provider: "Arjun Mehta, MD",
    facility: "Northfield Internal Medicine",
    sections: {
      hpi:
        "64-year-old male with cirrhosis due to chronic hepatitis C and opioid use disorder. Hepatitis C was diagnosed in 2023; he declined treatment then and is now ready to start. " +
        "Elastography 01/2025 showed liver stiffness of 18 kPa, consistent with cirrhosis. No ascites, confusion, jaundice or GI bleeding. " +
        "Last opioid use was in 2021; on buprenorphine-naloxone maintenance since then, attends counseling monthly, no cravings.",
      ros: "Constitutional: mild fatigue. GI: no abdominal swelling, melena or hematemesis. Neurologic: no confusion or sleep reversal. Skin: no jaundice or itching.",
      physical_exam:
        "BP 122/74, HR 70, BMI 24. Alert and oriented, no asterixis. Scattered spider angiomata on the chest. Abdomen: soft, firm liver edge, spleen tip palpable, " +
        "no shifting dullness. No edema.",
      medications: "Buprenorphine-naloxone 8/2 mg sublingual daily",
      labs:
        "HCV RNA 1,850,000 IU/mL, genotype 1a\nAlbumin 3.4 g/dL\nTotal bilirubin 1.3 mg/dL\nINR 1.2\nPlatelets 118 K/µL\nAFP 4 ng/mL\n" +
        "Liver ultrasound 04/2025: nodular contour, no mass, no ascites\nUpper endoscopy 04/2025: no esophageal or gastric varices",
      assessment_plan:
        "1. Cirrhosis of liver due to chronic hepatitis C, compensated (Child-Pugh A). No ascites or encephalopathy; endoscopy without varices. " +
        "Ultrasound and AFP every 6 months for liver cancer surveillance.\n" +
        "2. Chronic hepatitis C, genotype 1a, viremic. Start sofosbuvir-velpatasvir for 12 weeks; interactions with buprenorphine reviewed and not significant; " +
        "HCV RNA 12 weeks after completion.\n" +
        "3. Opioid use disorder, severe, in sustained remission on buprenorphine maintenance. Continue buprenorphine-naloxone 8/2 mg daily; PDMP reviewed; continue counseling.",
      signature: "Electronically signed by Arjun Mehta, MD on 05/14/2025 at 15:30.",
    },
    key: [
      {
        code: "K74.60",
        required: true,
        excerpt: "Cirrhosis of liver due to chronic hepatitis C, compensated",
        rationale: "Cirrhosis is documented and managed (surveillance). Code it with the chronic hepatitis C that causes it. Maps to HCC64.",
        trap: "none",
      },
      {
        code: "B18.2",
        required: true,
        excerpt: "Chronic hepatitis C, genotype 1a, viremic",
        rationale: "Chronic infection is documented and treatment starts today. Maps to HCC65, which cirrhosis (HCC64) trims.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "F11.21",
        required: true,
        excerpt: "Opioid use disorder, severe, in sustained remission on buprenorphine maintenance",
        rationale:
          "Severe use disorder corresponds to dependence; the provider documents sustained remission. Maintenance therapy is managed today. Maps to HCC137.",
        trap: "status_vs_history",
      },
    ],
    distractors: [
      {
        code: "B19.20",
        whyWrong: "The record documents chronic hepatitis C. Unspecified viral hepatitis C carries no HCC in V28.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "I85.00",
        whyWrong: "Endoscopy shows no varices. Esophageal varices would add an unsupported HCC63, which would also trim the cirrhosis HCC.",
        trap: "none",
      },
      {
        code: "F11.20",
        whyWrong: "The provider documents sustained remission, so the 'in remission' code applies, not uncomplicated active dependence.",
        trap: "status_vs_history",
      },
    ],
    expected: { hccs: [64, 137], trimmed: [65], raf: 0.871 },
  },

  {
    id: "00000000-0000-4000-8000-000000000109",
    title: "Heart failure, COPD and diabetic kidney disease",
    specialty: "Internal Medicine",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-11-04",
    patient: { name: "Ignatius Ferreira", dob: "1947-12-19", sex: "male", mrn: "SYN-420463" },
    provider: "Helen Stavros, DO",
    facility: "Northfield Internal Medicine",
    sections: {
      hpi:
        "77-year-old male with heart failure with preserved ejection fraction, hypertension, type 2 diabetes with diabetic kidney disease, and COPD. " +
        "Weight stable on home scale; sleeps on one pillow; no paroxysmal nocturnal dyspnea. Breathing at baseline; last COPD flare 2 years ago. Fasting sugars in the 120s on glargine.",
      ros:
        "Cardiovascular: mild ankle swelling by evening, no orthopnea or chest pain. Respiratory: stable exertional dyspnea, no change in sputum. Genitourinary: no change in urination.",
      physical_exam:
        "BP 142/80, HR 74, RR 16, SpO2 94% on room air, weight 201 lb (202 lb in August). JVP 7 cm. Lungs: mildly decreased breath sounds, no crackles or wheezes. " +
        "Heart: regular, no S3. Trace ankle edema bilaterally.",
      medications:
        "Furosemide 20 mg daily\nEmpagliflozin 10 mg daily\nLosartan 100 mg daily\nInsulin glargine 18 units nightly\nTiotropium/olodaterol 2 inhalations daily\nAtorvastatin 40 mg daily",
      labs:
        "Echocardiogram 03/2025: LVEF 60%, grade II diastolic dysfunction\nNT-proBNP 410 pg/mL (455 in 08/2025)\neGFR 41 mL/min/1.73m²\n" +
        "Urine albumin-to-creatinine ratio 260 mg/g\nHbA1c 7.2%\nPotassium 4.6 mmol/L",
      assessment_plan:
        "1. Chronic diastolic (congestive) heart failure, compensated. Euvolemic apart from trace edema; weight stable. Continue furosemide 20 mg and empagliflozin.\n" +
        "2. Hypertensive heart and chronic kidney disease with heart failure. BP 142/80 today; continue losartan, home BP log to be sent in 2 weeks.\n" +
        "3. Type 2 diabetes with diabetic chronic kidney disease, stage 3b. eGFR 41, UACR 260. Empagliflozin also for renal protection; BMP in 3 months.\n" +
        "4. A1c 7.2% on glargine 18 units nightly; continue.\n" +
        "5. COPD, stable on tiotropium/olodaterol; no exacerbation in 2 years. Continue; pneumococcal vaccine updated.",
      signature: "Electronically signed by Helen Stavros, DO on 11/04/2025 at 16:10.",
    },
    key: [
      {
        code: "I13.0",
        required: true,
        excerpt: "Hypertensive heart and chronic kidney disease with heart failure",
        rationale:
          "Hypertension, heart failure and CKD together take the combination code I13.0, with the heart failure type and the CKD stage coded as well. Maps to HCC226.",
        trap: "none",
      },
      {
        code: "I50.32",
        required: true,
        excerpt: "Chronic diastolic (congestive) heart failure, compensated",
        rationale: "Type and acuity documented: chronic, diastolic (preserved EF). Maps to HCC226.",
        trap: "missing_acuity",
      },
      {
        code: "E11.22",
        required: true,
        excerpt: "Type 2 diabetes with diabetic chronic kidney disease, stage 3b",
        rationale: "Linked and managed. Maps to HCC37.",
        trap: "none",
      },
      {
        code: "N18.32",
        required: true,
        excerpt: "stage 3b. eGFR 41",
        rationale: "Stage 3b documented (eGFR 30-44). Maps to HCC328.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "Z79.4",
        required: true,
        excerpt: "A1c 7.2% on glargine 18 units nightly",
        rationale: "Long-term insulin with type 2 diabetes. HCC38, trimmed by HCC37.",
        trap: "none",
      },
      {
        code: "J44.9",
        required: true,
        excerpt: "COPD, stable on tiotropium/olodaterol",
        rationale: "Assessed and treated, no exacerbation. Maps to HCC280.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "I50.33",
        whyWrong: "The heart failure is compensated with stable weight; no acute exacerbation is documented. 'Acute on chronic' would add an unsupported HCC224.",
        trap: "missing_acuity",
      },
      {
        code: "I11.0",
        whyWrong: "With hypertension, heart failure and CKD all present, ICD-10-CM requires I13.0. I11.0 leaves out the kidney involvement.",
        trap: "none",
      },
      {
        code: "J44.1",
        whyWrong: "No exacerbation in 2 years and none today. J44.1 requires a documented acute exacerbation.",
        trap: "missing_acuity",
      },
      {
        code: "E11.9",
        whyWrong: "'Without complications' contradicts the documented diabetic CKD.",
        trap: "unspecified_when_specific_exists",
      },
    ],
    expected: { hccs: [37, 226, 280, 328], trimmed: [38], raf: 0.972 },
  },

  // --- Geriatrics -------------------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000110",
    title: "Parkinson disease follow-up",
    specialty: "Geriatrics",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-01-22",
    patient: { name: "Ambrose Kettering", dob: "1945-07-11", sex: "male", mrn: "SYN-430158" },
    provider: "Yvonne Castellano, MD",
    facility: "Silver Birch Geriatric Clinic",
    sections: {
      hpi:
        "79-year-old male with Parkinson's disease diagnosed in 2021, seen with his daughter. Tremor and slowness are well controlled on carbidopa-levodopa; " +
        "no wearing-off between doses and no involuntary movements. He has never taken an antipsychotic or antiemetic. Lightheaded when standing quickly, worse in the morning; " +
        "one near-fall in December. Two to three bowel movements a week for several months. His daughter asked about his memory; he manages his own finances and medications.",
      ros: "Neurologic: tremor improved, no falls. Cardiovascular: lightheaded on standing, no syncope. GI: infrequent hard stools, no bleeding.",
      physical_exam:
        "BP 132/78 supine and 108/70 standing at 3 minutes; HR 70 supine, 76 standing. Mild resting tremor of the right hand, mild bradykinesia, cogwheel rigidity at the right wrist. " +
        "Gait: reduced arm swing, turns in 3 steps, no retropulsion. MoCA 27/30.",
      medications: "Carbidopa-levodopa 25/100 mg three times daily\nPolyethylene glycol 17 g daily (new)",
      assessment_plan:
        "1. Parkinson's disease without dyskinesia, without fluctuations. Motor symptoms controlled; continue carbidopa-levodopa 25/100 three times daily; physical therapy for gait and balance.\n" +
        "2. Orthostatic hypotension, likely related to Parkinson's disease and levodopa. Fluids 2 L/day, compression stockings, rise slowly; recheck in 4 weeks.\n" +
        "3. Chronic constipation. Start polyethylene glycol 17 g daily.\n" +
        "4. Memory concern raised by his daughter: MoCA 27/30 and independent in daily finances and medications. No cognitive impairment found; reassess yearly.",
      signature: "Electronically signed by Yvonne Castellano, MD on 01/22/2025 at 13:15.",
    },
    key: [
      {
        code: "G20.A1",
        required: true,
        excerpt: "Parkinson's disease without dyskinesia, without fluctuations",
        rationale: "Since FY2024, Parkinson's codes capture dyskinesia and fluctuations; both are documented as absent. Maps to HCC199.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "I95.1",
        required: true,
        excerpt: "Orthostatic hypotension, likely related to Parkinson's disease and levodopa",
        rationale: "Measured (BP drop on standing) and treated. No HCC.",
        trap: "none",
      },
      {
        code: "K59.09",
        required: true,
        excerpt: "Chronic constipation",
        rationale: "Chronic constipation indexes to K59.09 (other constipation). Treated today. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "G20.C",
        whyWrong: "Parkinson's disease is diagnosed, with dyskinesia and fluctuation status documented. 'Parkinsonism, unspecified' is less specific (same HCC199).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "G21.11",
        whyWrong: "He has never taken a neuroleptic; the provider documents idiopathic Parkinson's disease, so a drug-induced cause is unsupported.",
        trap: "unsupported_linkage",
      },
      {
        code: "F03.90",
        whyWrong: "Cognition was evaluated and found normal (MoCA 27/30). No dementia is diagnosed; F03.90 would add an unsupported HCC127.",
        trap: "none",
      },
    ],
    expected: { hccs: [199], trimmed: [], raf: 0.615 },
  },

  {
    id: "00000000-0000-4000-8000-000000000111",
    title: "Moderate Alzheimer dementia with weight loss and a pressure injury",
    specialty: "Geriatrics",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-09-17",
    patient: { name: "Winifred Achebe-Larsen", dob: "1939-04-02", sex: "female", mrn: "SYN-430290" },
    provider: "Yvonne Castellano, MD",
    facility: "Silver Birch Geriatric Clinic (home visit)",
    sections: {
      hpi:
        "86-year-old female with Alzheimer's disease, seen at home with her son, who is her caregiver. Needs help with bathing and dressing, cannot manage her medications, " +
        "recognizes family, no wandering, agitation or hallucinations. Eating about half her meals for 3 months; weight down from 128 lb in June to 117 lb. " +
        "Spends most of the day in a recliner. Her son noticed a sore on her tailbone a week ago.",
      ros: "Constitutional: weight loss, reduced appetite. Skin: sore over the tailbone. Psychiatric: no agitation or hallucinations per son.",
      physical_exam:
        "BP 118/66, HR 78, weight 117 lb, BMI 19.4. Oriented to person only; follows one-step commands. Temporal wasting, reduced muscle bulk in the upper arms. " +
        "Sacrum: 2.0 x 1.5 cm shallow open ulcer with a red-pink wound bed, partial-thickness skin loss, no slough, no tunneling. Heels intact.",
      medications: "Donepezil 10 mg nightly\nMemantine 10 mg twice daily\nMirtazapine 7.5 mg nightly (new)\nOral nutrition supplement twice daily (new)",
      labs: "Albumin 3.1 g/dL\nPrealbumin 14 mg/dL\nTSH 1.8 mIU/L\nHemoglobin 11.6 g/dL",
      assessment_plan:
        "1. Alzheimer's disease, late onset, with moderate dementia, without behavioral disturbance. Continue donepezil and memantine; caregiver support resources reviewed.\n" +
        "2. Moderate protein-calorie malnutrition: 8.6% weight loss in 3 months, intake about 50% of needs, muscle wasting. Dietitian referral, oral supplement twice daily, " +
        "start mirtazapine 7.5 mg at night for appetite and sleep.\n" +
        "3. Pressure ulcer of sacral region, stage 2. Foam dressing changed every 3 days; pressure-redistributing cushion for the recliner; reposition every 2 hours; home health nursing referral.",
      signature: "Electronically signed by Yvonne Castellano, MD on 09/17/2025 at 12:02.",
    },
    key: [
      {
        code: "G30.1",
        required: true,
        excerpt: "Alzheimer's disease, late onset",
        rationale: "The underlying disease is sequenced first, followed by the dementia code for severity and behavior. Maps to HCC127.",
        trap: "none",
      },
      {
        code: "F02.B0",
        required: true,
        excerpt: "with moderate dementia, without behavioral disturbance",
        rationale: "Dementia in Alzheimer's disease, moderate, without behavioral disturbance. Maps to HCC126, which trims HCC127.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "E44.0",
        required: true,
        excerpt: "Moderate protein-calorie malnutrition",
        rationale: "Diagnosed with criteria and treated. Complete coding includes it, though V28 removed protein-calorie malnutrition from the model (no HCC).",
        trap: "none",
      },
      {
        code: "L89.152",
        required: true,
        excerpt: "Pressure ulcer of sacral region, stage 2",
        rationale: "Partial-thickness skin loss is stage 2. Maps to HCC382.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "F03.90",
        whyWrong: "The cause (Alzheimer's) and the stage (moderate) are both documented. Unspecified dementia of unspecified severity loses both.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "L89.153",
        whyWrong: "Partial-thickness skin loss is stage 2; stage 3 requires full-thickness loss. Would overstate the ulcer as HCC381.",
        trap: "none",
      },
      {
        code: "E43",
        whyWrong: "Severity is documented as moderate. Severe malnutrition is unsupported (neither carries an HCC in V28).",
        trap: "none",
      },
    ],
    expected: { hccs: [126, 382], trimmed: [127], raf: 1.179 },
  },

  {
    id: "00000000-0000-4000-8000-000000000112",
    title: "Stroke residuals, feeding tube and a deep pressure ulcer",
    specialty: "Geriatrics",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-12-02",
    patient: { name: "Thaddeus Moravec", dob: "1943-05-25", sex: "male", mrn: "SYN-430441" },
    provider: "Grace Adeyemi-Holt, MD",
    facility: "Willow Crest Skilled Nursing Facility",
    sections: {
      hpi:
        "82-year-old right-handed male, long-term resident, seen for his monthly visit. A right MCA ischemic stroke in 03/2024 left him with left-sided weakness and dysphagia; " +
        "a PEG tube was placed in 04/2024 and he takes nothing by mouth except small tastes with speech therapy. Permanent atrial fibrillation on apixaban. " +
        "A sacral wound first noted in 09/2025 has deepened despite turning; the wound nurse measured it yesterday.",
      ros: "Limited by fatigue. Nursing reports no fever, cough, vomiting or tube feeding intolerance.",
      physical_exam:
        "BP 126/72, HR 82 irregularly irregular, temperature 98.4 F. Left arm strength 1/5, left leg 2/5; right side 5/5. Wet voice with thin liquids on bedside swallow check. " +
        "PEG site clean, no erythema. Sacrum: 4.0 x 3.5 cm ulcer, depth 1.8 cm, exposed bone at the base, moderate slough, no odor or surrounding cellulitis.",
      medications:
        "Apixaban 5 mg twice daily via PEG\nMetoprolol tartrate 25 mg twice daily via PEG\nEnteral formula 1.5 kcal/mL at 55 mL/h, 20 hours a day\nCollagenase ointment to the sacral wound daily",
      labs: "Albumin 3.3 g/dL\nWBC 7.8 K/µL\nESR 32 mm/h\nHemoglobin 12.1 g/dL\nMRI pelvis 11/2025: no osteomyelitis",
      assessment_plan:
        "1. Left-sided hemiplegia following cerebral infarction, left non-dominant side (patient is right-handed). Deficits unchanged; continue therapy for contracture prevention and positioning.\n" +
        "2. Oropharyngeal dysphagia following cerebral infarction. Remains NPO except therapeutic tastes with speech therapy; aspiration precautions.\n" +
        "3. Gastrostomy status. PEG site healthy; continue enteral formula, rate increased to 60 mL/h for wound healing per dietitian.\n" +
        "4. Pressure ulcer of sacral region, stage 4, with exposed bone; MRI negative for osteomyelitis. Collagenase and moist dressing daily, low-air-loss mattress, wound care consult, " +
        "surgical debridement evaluation.\n" +
        "5. Permanent atrial fibrillation, rate controlled. Continue metoprolol and apixaban.",
      signature: "Electronically signed by Grace Adeyemi-Holt, MD on 12/02/2025 at 10:35.",
    },
    key: [
      {
        code: "I69.354",
        required: true,
        excerpt: "Left-sided hemiplegia following cerebral infarction, left non-dominant side",
        rationale:
          "A residual deficit of a past stroke takes the I69.3- sequela code. Right-handed patient, left side affected: non-dominant. Maps to HCC253.",
        trap: "status_vs_history",
      },
      {
        code: "I69.391",
        required: true,
        excerpt: "Oropharyngeal dysphagia following cerebral infarction",
        rationale: "Dysphagia as a stroke sequela. I69.391 instructs to add the dysphagia type. No HCC.",
        trap: "none",
      },
      {
        code: "R13.12",
        required: true,
        excerpt: "Oropharyngeal dysphagia",
        rationale: "The dysphagia phase is documented (oropharyngeal), coded in addition to I69.391. No HCC.",
        trap: "none",
      },
      {
        code: "Z93.1",
        required: true,
        excerpt: "Gastrostomy status. PEG site healthy",
        rationale: "The PEG is in use and its site is evaluated. Gastrostomy status maps to HCC463.",
        trap: "none",
      },
      {
        code: "L89.154",
        required: true,
        excerpt: "Pressure ulcer of sacral region, stage 4, with exposed bone",
        rationale: "Exposed bone is stage 4. Maps to HCC379, the top of the skin ulcer hierarchy.",
        trap: "none",
      },
      {
        code: "I48.21",
        required: true,
        excerpt: "Permanent atrial fibrillation, rate controlled",
        rationale: "Type documented (permanent) and managed. Maps to HCC238.",
        trap: "unspecified_when_specific_exists",
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
        code: "I63.9",
        whyWrong: "I63.- covers the acute stroke episode. A 2024 stroke with current deficits is coded with I69.3- sequela codes; I63.9 would add an unsupported HCC249.",
        trap: "status_vs_history",
      },
      {
        code: "Z86.73",
        whyWrong: "That code means history of stroke without residual deficits. Hemiplegia and dysphagia are documented residuals.",
        trap: "status_vs_history",
      },
      {
        code: "L89.153",
        whyWrong: "Exposed bone makes this stage 4. Stage 3 understates it (HCC381 instead of HCC379).",
        trap: "none",
      },
    ],
    expected: { hccs: [238, 253, 379, 463], trimmed: [], raf: 3.324 },
  },
];

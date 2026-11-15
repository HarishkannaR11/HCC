/**
 * Library charts: Pulmonology, Oncology, Neurology, Psychiatry.
 *
 * EVERY PERSON, DATE, MRN, PROVIDER AND FACILITY HERE IS INVENTED. Synthetic
 * teaching charts; no real patient record was used or consulted.
 */
import type { SeedChart } from "../types";

export const SPECIALTY_CHARTS: SeedChart[] = [
  // --- Pulmonology -----------------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000122",
    title: "Emphysema in a current smoker",
    specialty: "Pulmonology",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-02-04",
    patient: { name: "Clement Haverford", dob: "1954-11-23", sex: "male", mrn: "SYN-470118" },
    provider: "Naomi Brightman, MD",
    facility: "Summit Lung and Sleep Center",
    sections: {
      hpi:
        "70-year-old male with centrilobular emphysema on CT and a 45 pack-year smoking history; still smokes about 10 cigarettes a day. Dyspnea walking one block, unchanged since his last visit; " +
        "no increase in cough or sputum and no prednisone or antibiotics since then. Past history lists atrial fibrillation from a single episode during hip surgery in 2019; " +
        "he takes no rhythm or anticoagulant medication.",
      ros: "Respiratory: chronic exertional dyspnea, morning cough with scant white sputum, unchanged. Cardiovascular: no palpitations or edema.",
      physical_exam:
        "BP 130/78, HR 84 regular, RR 18, SpO2 93% on room air. Barrel chest, prolonged expiration, distant breath sounds, no wheezes. No clubbing or edema.",
      medications: "Umeclidinium/vilanterol 62.5/25 mcg, 1 inhalation daily\nAlbuterol HFA as needed\nNicotine patch 14 mg daily (new)",
      labs:
        "CT chest 01/2025: centrilobular emphysema, upper-lobe predominant, no nodules\nSpirometry 01/2025: FEV1/FVC 0.55, FEV1 58% predicted\n6-minute walk: lowest SpO2 91%",
      assessment_plan:
        "1. Centrilobular emphysema, stable, no exacerbation. Continue umeclidinium/vilanterol and albuterol; pulmonary rehabilitation referral.\n" +
        "2. Nicotine dependence, cigarettes. Counseled for 5 minutes; start nicotine patch 14 mg with lozenges for cravings; quit date set.\n" +
        "3. Exertional saturation stays above 88%; no oxygen needed.",
      signature: "Electronically signed by Naomi Brightman, MD on 02/04/2025 at 11:10.",
    },
    key: [
      {
        code: "J43.2",
        required: true,
        excerpt: "Centrilobular emphysema, stable, no exacerbation",
        rationale: "Emphysema type is documented (centrilobular) and treated. Maps to HCC280.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "F17.210",
        required: true,
        excerpt: "Nicotine dependence, cigarettes",
        rationale: "Current cigarette dependence, counseled and treated. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "J44.9",
        whyWrong: "Category J44 excludes emphysema without chronic bronchitis (J43.-). Code the emphysema alone; J44.9 alongside J43.2 is a coding error.",
        trap: "none",
      },
      {
        code: "J43.9",
        whyWrong: "The emphysema type is documented (centrilobular). Unspecified emphysema is less specific (same HCC280).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "J44.1",
        whyWrong: "No exacerbation is documented; no steroids or antibiotics, and symptoms are unchanged.",
        trap: "missing_acuity",
      },
      {
        code: "I48.91",
        whyWrong:
          "A single post-operative AF episode in 2019 appears only in the past history, with no current evaluation or treatment. No support (MEAT); it would add HCC238.",
        trap: "no_treatment_documented",
      },
    ],
    expected: { hccs: [280], trimmed: [], raf: 0.319 },
  },

  {
    id: "00000000-0000-4000-8000-000000000123",
    title: "Severe persistent asthma on a biologic",
    specialty: "Pulmonology",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-05-20",
    patient: { name: "Marisol Etxeberria", dob: "1959-08-26", sex: "female", mrn: "SYN-470245" },
    provider: "Naomi Brightman, MD",
    facility: "Summit Lung and Sleep Center",
    sections: {
      hpi:
        "65-year-old female, lifelong nonsmoker, with severe persistent eosinophilic asthma, allergic rhinitis and reflux. On high-dose inhaled corticosteroid/LABA plus tiotropium; " +
        "benralizumab started in 01/2025. One prednisone course since then (February), compared with four in 2024. Night symptoms once a week; albuterol 2-3 days a week. Breathing at her baseline today.",
      ros: "Respiratory: intermittent wheeze, no fever or purulent sputum. ENT: nasal congestion. GI: heartburn controlled on omeprazole.",
      physical_exam:
        "BP 126/76, HR 78, RR 16, SpO2 97% on room air. Speaking full sentences. Few end-expiratory wheezes, good air movement. Nasal turbinates pale and boggy.",
      medications:
        "Fluticasone furoate/vilanterol 200/25 mcg daily\nTiotropium 2.5 mcg, 2 inhalations daily\nBenralizumab 30 mg subcutaneously every 8 weeks\nAlbuterol HFA as needed\n" +
        "Fluticasone nasal spray daily\nOmeprazole 20 mg daily",
      labs:
        "Spirometry today: FEV1 68% predicted, 15% improvement after bronchodilator\nBlood eosinophils 01/2025, before biologic: 520 cells/µL\nFeNO 38 ppb\nAsthma Control Test: 18",
      assessment_plan:
        "1. Severe persistent asthma, uncomplicated today, improved on benralizumab. Eosinophilic phenotype. Continue high-dose fluticasone furoate/vilanterol, tiotropium and benralizumab every 8 weeks; " +
        "asthma action plan updated.\n" +
        "2. Allergic rhinitis; continue intranasal fluticasone.\n" +
        "3. Gastro-esophageal reflux disease without esophagitis, controlled on omeprazole; continue.",
      signature: "Electronically signed by Naomi Brightman, MD on 05/20/2025 at 15:35.",
    },
    key: [
      {
        code: "J45.50",
        required: true,
        excerpt: "Severe persistent asthma, uncomplicated today",
        rationale: "Severity is documented and supported by the regimen (high-dose ICS/LABA plus a biologic). In V28 only severe persistent asthma carries an HCC (HCC279, 0.818).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "J82.83",
        required: false,
        excerpt: "Eosinophilic phenotype",
        rationale: "Eosinophilic asthma is coded in addition to the asthma severity. Optional for scoring; no HCC.",
        trap: "none",
      },
      {
        code: "J30.9",
        required: true,
        excerpt: "Allergic rhinitis; continue intranasal fluticasone",
        rationale: "Treated. No HCC.",
        trap: "none",
      },
      {
        code: "K21.9",
        required: true,
        excerpt: "Gastro-esophageal reflux disease without esophagitis",
        rationale: "Treated. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "J45.40",
        whyWrong: "The provider documents severe persistent asthma. Moderate persistent asthma carries no HCC in V28 and understates the record.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "J45.51",
        whyWrong: "She is at baseline today with no exacerbation documented.",
        trap: "missing_acuity",
      },
      {
        code: "J44.9",
        whyWrong: "A lifelong nonsmoker with reversible obstruction (15% bronchodilator response); COPD is not diagnosed.",
        trap: "none",
      },
    ],
    expected: { hccs: [279], trimmed: [], raf: 0.818 },
  },

  {
    id: "00000000-0000-4000-8000-000000000124",
    title: "Idiopathic pulmonary fibrosis on home oxygen",
    specialty: "Pulmonology",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-09-09",
    patient: { name: "Augustin Pereira-Hale", dob: "1951-01-05", sex: "male", mrn: "SYN-470398" },
    provider: "Naomi Brightman, MD",
    facility: "Summit Lung and Sleep Center",
    sections: {
      hpi:
        "74-year-old male with idiopathic pulmonary fibrosis (diagnosed 2022 by multidisciplinary review, UIP pattern on CT) on nintedanib, and on home oxygen since 2024: " +
        "2 L/min at rest and 4 L/min with exertion. Breathlessness slowly worse over the year; no recent infection, fever or sudden change. " +
        "Right heart catheterization in 06/2025 showed pulmonary hypertension attributed to his lung disease.",
      ros: "Respiratory: dry cough, exertional dyspnea, no hemoptysis. Cardiovascular: mild ankle swelling, no chest pain or syncope. GI: occasional heartburn.",
      physical_exam:
        "BP 118/72, HR 92, RR 22, SpO2 89% on room air at rest and 94% on 2 L. Fine bibasilar inspiratory crackles. Digital clubbing. Mild ankle edema.",
      medications:
        "Nintedanib 150 mg twice daily\nInhaled treprostinil 6 breaths four times daily (started 07/2025)\nFurosemide 20 mg daily\nPantoprazole 40 mg daily\nHome oxygen 2-4 L/min",
      labs:
        "Pulmonary function 08/2025: FVC 54% predicted (61% in 2024), DLCO 31% predicted\nRight heart catheterization 06/2025: mean PA pressure 34 mmHg, PVR 4.2 Wood units, wedge 10 mmHg\n" +
        "Arterial blood gas on room air 08/2025: pH 7.42, PaO2 54 mmHg, PaCO2 38 mmHg",
      assessment_plan:
        "1. Idiopathic pulmonary fibrosis, progressive (FVC down 7% in a year). Continue nintedanib; he declined lung transplant evaluation after discussion; pulmonary rehabilitation.\n" +
        "2. Chronic respiratory failure with hypoxia, PaO2 54 on room air. Continue home oxygen 2 L/min at rest and 4 L/min with exertion; dependent on supplemental oxygen.\n" +
        "3. Pulmonary hypertension due to interstitial lung disease (group 3), confirmed on right heart catheterization. Continue inhaled treprostinil; furosemide for edema.\n" +
        "4. GERD, continue pantoprazole; reflux control may slow fibrosis progression.",
      signature: "Electronically signed by Naomi Brightman, MD on 09/09/2025 at 14:20.",
    },
    key: [
      {
        code: "J84.112",
        required: true,
        excerpt: "Idiopathic pulmonary fibrosis, progressive",
        rationale: "IPF is specifically documented and treated. Maps to HCC278 (0.818), well above unspecified fibrosis (HCC280).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "J96.11",
        required: true,
        excerpt: "Chronic respiratory failure with hypoxia, PaO2 54 on room air",
        rationale: "Chronic, hypoxic, supported by blood gas and home oxygen. Maps to HCC213.",
        trap: "missing_acuity",
      },
      {
        code: "Z99.81",
        required: true,
        excerpt: "dependent on supplemental oxygen",
        rationale: "Oxygen dependence status. No HCC; the respiratory failure carries the risk.",
        trap: "none",
      },
      {
        code: "I27.23",
        required: true,
        excerpt: "Pulmonary hypertension due to interstitial lung disease (group 3)",
        rationale: "Type and cause documented, confirmed on catheterization, treated. Maps to HCC226 in V28.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "K21.9",
        required: true,
        excerpt: "GERD, continue pantoprazole",
        rationale: "Treated. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "J84.10",
        whyWrong: "IPF is documented. Unspecified pulmonary fibrosis maps to HCC280 (0.319) instead of HCC278 (0.818).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "J96.01",
        whyWrong: "The respiratory failure is chronic and stable on home oxygen; no acute decline is documented.",
        trap: "missing_acuity",
      },
      {
        code: "I27.20",
        whyWrong: "The type and cause are documented (group 3, due to lung disease). Unspecified pulmonary hypertension is less specific (same HCC226).",
        trap: "unspecified_when_specific_exists",
      },
    ],
    expected: { hccs: [213, 226, 278], trimmed: [], raf: 1.548 },
  },

  // --- Oncology --------------------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000125",
    title: "Prostate cancer on androgen deprivation therapy",
    specialty: "Oncology",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-03-25",
    patient: { name: "Wendell Ashcombe", dob: "1949-10-12", sex: "male", mrn: "SYN-480152" },
    provider: "Sunita Raghavan, MD",
    facility: "Lakeview Cancer Center",
    sections: {
      hpi:
        "75-year-old male with high-risk prostate adenocarcinoma (Gleason 4+4, diagnosed 11/2023), treated with external beam radiation completed 04/2024 and on androgen deprivation therapy " +
        "with leuprolide every 3 months, planned for 24 months. Hot flashes controlled with venlafaxine; otherwise well. No bone pain. Past history also lists COPD, which his primary care " +
        "physician follows; he uses no inhalers.",
      ros: "Constitutional: hot flashes, no weight loss. Musculoskeletal: no bone pain. Genitourinary: mild nocturia, no hematuria.",
      physical_exam: "BP 134/80, HR 70, BMI 27. No spinal tenderness. Lungs: clear. No inguinal or supraclavicular lymphadenopathy.",
      medications: "Leuprolide 22.5 mg intramuscularly every 3 months (given today)\nVenlafaxine 37.5 mg daily\nCalcium with vitamin D daily",
      labs: "PSA 0.04 ng/mL (14.2 at diagnosis)\nTestosterone 18 ng/dL (castrate)\nBone scan 01/2025: no metastatic disease",
      assessment_plan:
        "1. Malignant neoplasm of prostate, high risk, on androgen deprivation therapy (month 16 of 24). PSA 0.04 with castrate testosterone. Leuprolide 22.5 mg given today; " +
        "hot flashes controlled on venlafaxine; continue calcium and vitamin D for bone health. PSA and visit in 3 months.",
      signature: "Electronically signed by Sunita Raghavan, MD on 03/25/2025 at 10:45.",
    },
    key: [
      {
        code: "C61",
        required: true,
        excerpt: "Malignant neoplasm of prostate, high risk, on androgen deprivation therapy",
        rationale: "Treatment directed at the cancer is ongoing (leuprolide given today), so the cancer is current even with an undetectable PSA. Maps to HCC23.",
        trap: "status_vs_history",
      },
    ],
    distractors: [
      {
        code: "Z85.46",
        whyWrong: "Androgen deprivation therapy is current treatment for the cancer, so it is coded as active (C61), not as history.",
        trap: "status_vs_history",
      },
      {
        code: "C79.51",
        whyWrong: "The bone scan shows no metastatic disease. Bone metastases would add an unsupported HCC18.",
        trap: "none",
      },
      {
        code: "J44.9",
        whyWrong: "COPD appears only in the past history and is managed elsewhere; it is not evaluated or treated at this visit. No support (MEAT); it would add HCC280.",
        trap: "no_treatment_documented",
      },
    ],
    expected: { hccs: [23], trimmed: [], raf: 0.186 },
  },

  {
    id: "00000000-0000-4000-8000-000000000126",
    title: "Breast cancer on adjuvant tamoxifen",
    specialty: "Oncology",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-07-08",
    patient: { name: "Celestine Abara", dob: "1977-11-19", sex: "female", mrn: "SYN-480306" },
    provider: "Sunita Raghavan, MD",
    facility: "Lakeview Cancer Center",
    sections: {
      hpi:
        "47-year-old premenopausal female with stage IIA invasive ductal carcinoma of the upper-outer quadrant of the right breast, ER-positive, PR-positive, HER2-negative, diagnosed 06/2024. " +
        "Lumpectomy and sentinel node biopsy 07/2024; adjuvant radiation completed 10/2024; on tamoxifen since 11/2024 with a plan for 5-10 years. Mild hot flashes; no vaginal bleeding, " +
        "leg swelling or new breast lumps.",
      ros: "Constitutional: mild hot flashes, no weight loss. Breast: no new lumps or discharge. Gynecologic: regular cycles, no abnormal bleeding. Musculoskeletal: no bone pain.",
      physical_exam:
        "BP 120/74, HR 72. Right breast: healed lumpectomy scar in the upper-outer quadrant, mild radiation skin changes, no masses. Left breast: normal. No axillary or supraclavicular nodes.",
      medications: "Tamoxifen 20 mg daily",
      labs: "Diagnostic mammogram 06/2025: post-surgical changes, no suspicious findings\nCBC and liver panel normal",
      assessment_plan:
        "1. Malignant neoplasm of upper-outer quadrant of right female breast, ER-positive, on adjuvant tamoxifen (month 8). No evidence of recurrence. Continue tamoxifen 20 mg daily; " +
        "next mammogram 06/2026; hot flashes managed with non-hormonal measures; gynecologic warning signs reviewed.",
      signature: "Electronically signed by Sunita Raghavan, MD on 07/08/2025 at 16:00.",
    },
    key: [
      {
        code: "C50.411",
        required: true,
        excerpt: "Malignant neoplasm of upper-outer quadrant of right female breast",
        rationale:
          "Adjuvant tamoxifen is treatment directed at the cancer, so it is coded as current. CMS applies an age edit: under 50 this maps to HCC22 (0.363), at 50 and over to HCC23 (0.186).",
        trap: "status_vs_history",
      },
      {
        code: "Z17.0",
        required: true,
        excerpt: "ER-positive",
        rationale: "Estrogen receptor status is coded with breast cancer. No HCC.",
        trap: "none",
      },
      {
        code: "Z79.810",
        required: true,
        excerpt: "on adjuvant tamoxifen",
        rationale: "Tamoxifen is a selective estrogen receptor modulator: long-term use is coded. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "Z85.3",
        whyWrong: "She is on adjuvant tamoxifen, treatment directed at the cancer, so it is current, not history.",
        trap: "status_vs_history",
      },
      {
        code: "C50.911",
        whyWrong: "The quadrant is documented (upper-outer). Unspecified site is less specific than the record.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "C50.412",
        whyWrong: "The cancer is in the right breast; this code is for the left.",
        trap: "none",
      },
    ],
    expected: { hccs: [22], trimmed: [], raf: 0.363 },
  },

  {
    id: "00000000-0000-4000-8000-000000000127",
    title: "Metastatic lung cancer with a new leg clot",
    specialty: "Oncology",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-11-18",
    patient: { name: "Lucius Hargreave", dob: "1957-05-07", sex: "male", mrn: "SYN-480459" },
    provider: "Mateo Villanueva-Cruz, MD",
    facility: "Lakeview Cancer Center",
    sections: {
      hpi:
        "68-year-old male with adenocarcinoma of the right upper lobe (EGFR-negative, PD-L1 70%) diagnosed 05/2025 with metastases to bone (T8 and left iliac) and two small brain metastases " +
        "treated with stereotactic radiosurgery 06/2025. On pembrolizumab every 3 weeks, cycle 8 today. Left calf swelling and pain for 4 days; duplex ultrasound yesterday showed acute deep vein " +
        "thrombosis of the left femoral vein. No chest pain or hemoptysis. Mild back pain controlled.",
      ros: "Respiratory: mild cough, no hemoptysis or chest pain. Musculoskeletal: mid-back ache. Neurologic: no headache, weakness or seizures. Extremities: left leg swelling.",
      physical_exam:
        "BP 128/76, HR 88, SpO2 96% on room air. Left calf 3 cm larger than the right, tender along the femoral vein, no erythema. Decreased breath sounds at the right apex. " +
        "Neurologic exam nonfocal. Tenderness over the mid-thoracic spine.",
      medications:
        "Pembrolizumab 200 mg IV every 3 weeks\nApixaban 10 mg twice daily for 7 days, then 5 mg twice daily (started yesterday)\nDenosumab 120 mg subcutaneously every 4 weeks\nOxycodone 5 mg as needed",
      labs:
        "CT chest, abdomen and pelvis 11/2025: right upper lobe mass 3.1 cm (4.0 cm in 05/2025); stable sclerotic T8 and left iliac lesions; no liver metastases\n" +
        "MRI brain 10/2025: treated lesions smaller, no new lesions\nDuplex ultrasound 11/17/2025: acute occlusive thrombus, left femoral vein\nPlatelets 210 K/µL; creatinine 0.9 mg/dL",
      assessment_plan:
        "1. Malignant neoplasm of upper lobe, right lung, responding to pembrolizumab. Cycle 8 today; restaging in 9 weeks.\n" +
        "2. Secondary malignant neoplasm of brain, treated with radiosurgery, smaller on the 10/2025 MRI. Repeat MRI in 3 months.\n" +
        "3. Secondary malignant neoplasm of bone (T8, left iliac), stable. Continue denosumab; oxycodone as needed for back pain.\n" +
        "4. Acute deep vein thrombosis of left femoral vein, cancer-associated. Apixaban 10 mg twice daily for 7 days, then 5 mg twice daily for at least 6 months; leg elevation.\n" +
        "5. Long-term current use of anticoagulant.",
      signature: "Electronically signed by Mateo Villanueva-Cruz, MD on 11/18/2025 at 12:30.",
    },
    key: [
      {
        code: "C34.11",
        required: true,
        excerpt: "Malignant neoplasm of upper lobe, right lung",
        rationale: "Primary site and laterality documented, under active treatment. HCC20, trimmed by HCC17.",
        trap: "none",
      },
      {
        code: "C79.31",
        required: true,
        excerpt: "Secondary malignant neoplasm of brain",
        rationale: "Treated metastases still under surveillance and therapy are current. Maps to HCC17 (4.209), the top of the cancer hierarchy.",
        trap: "status_vs_history",
      },
      {
        code: "C79.51",
        required: true,
        excerpt: "Secondary malignant neoplasm of bone",
        rationale: "Current, treated with denosumab. HCC18, trimmed by HCC17.",
        trap: "none",
      },
      {
        code: "I82.412",
        required: true,
        excerpt: "Acute deep vein thrombosis of left femoral vein",
        rationale: "Acute, with vessel and side documented, and treated. Maps to HCC267, outside the cancer hierarchy.",
        trap: "missing_acuity",
      },
      {
        code: "Z79.01",
        required: false,
        excerpt: "Long-term current use of anticoagulant",
        rationale: "Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "C78.01",
        whyWrong: "The lung is the primary site, not a metastasis. Secondary lung cancer would misstate the disease.",
        trap: "none",
      },
      {
        code: "Z85.118",
        whyWrong: "The lung cancer is under active treatment (pembrolizumab today), so it is current, not history.",
        trap: "status_vs_history",
      },
      {
        code: "I82.512",
        whyWrong: "The thrombosis is documented as acute (4 days, new on ultrasound). Chronic is wrong.",
        trap: "missing_acuity",
      },
    ],
    expected: { hccs: [17, 267], trimmed: [18, 20], raf: 4.503 },
  },

  // --- Neurology -------------------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000128",
    title: "Focal epilepsy and migraine follow-up",
    specialty: "Neurology",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-02-12",
    patient: { name: "Ottoline Breckenridge", dob: "1958-12-01", sex: "female", mrn: "SYN-490137" },
    provider: "Farid Haddad, MD",
    facility: "Crestview Neurology Associates",
    sections: {
      hpi:
        "66-year-old female with focal epilepsy with impaired-awareness seizures from left mesial temporal sclerosis, and migraine without aura. Last seizure 14 months ago; previously 2-3 a year " +
        "with staring and lip-smacking. Adherent to levetiracetam. Migraines about twice a month, relieved by sumatriptan.",
      ros: "Neurologic: no seizures, no new weakness or numbness; headaches as above. Psychiatric: mood good on levetiracetam.",
      physical_exam: "Alert, fluent speech, normal recall. Cranial nerves intact. Strength, sensation, coordination and gait normal.",
      medications: "Levetiracetam 750 mg twice daily\nSumatriptan 50 mg as needed",
      labs: "Levetiracetam level 18 mcg/mL (therapeutic)\nMRI brain 2023: left mesial temporal sclerosis\nEEG 2024: left temporal sharp waves",
      assessment_plan:
        "1. Localization-related symptomatic epilepsy with complex partial (focal impaired awareness) seizures, not intractable, due to left mesial temporal sclerosis. " +
        "Seizure-free for 14 months on levetiracetam; continue 750 mg twice daily. Cleared to drive under state law; seizure precautions reviewed.\n" +
        "2. Migraine without aura, not intractable, about twice monthly. Continue sumatriptan as needed; headache diary.",
      signature: "Electronically signed by Farid Haddad, MD on 02/12/2025 at 14:30.",
    },
    key: [
      {
        code: "G40.209",
        required: true,
        excerpt: "Localization-related symptomatic epilepsy with complex partial (focal impaired awareness) seizures, not intractable",
        rationale: "Type, seizure form and intractability are documented. Maps to HCC201.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "G93.81",
        required: false,
        excerpt: "left mesial temporal sclerosis",
        rationale: "The documented cause (temporal sclerosis) may be coded. Optional for scoring; no HCC.",
        trap: "none",
      },
      {
        code: "G43.009",
        required: true,
        excerpt: "Migraine without aura, not intractable",
        rationale: "Type and intractability documented, treated. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "R56.9",
        whyWrong: "Epilepsy is diagnosed. Unspecified convulsions is a symptom code and is not used when the condition is known.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "G40.219",
        whyWrong: "The provider documents 'not intractable'; she has been seizure-free for 14 months.",
        trap: "none",
      },
      {
        code: "G40.909",
        whyWrong: "Focal epilepsy with complex partial seizures is documented. Unspecified epilepsy is less specific (same HCC201).",
        trap: "unspecified_when_specific_exists",
      },
    ],
    expected: { hccs: [201], trimmed: [], raf: 0.245 },
  },

  {
    id: "00000000-0000-4000-8000-000000000129",
    title: "Relapsing-remitting multiple sclerosis",
    specialty: "Neurology",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-10-14",
    patient: { name: "Imogen Thackeray", dob: "1972-03-09", sex: "female", mrn: "SYN-490281" },
    provider: "Farid Haddad, MD",
    facility: "Crestview Neurology Associates",
    sections: {
      hpi:
        "53-year-old female with relapsing-remitting multiple sclerosis diagnosed in 2016, on ocrelizumab since 2020, with no relapse since 2021. Urinary urgency with about two episodes " +
        "of urge incontinence a week, improved on mirabegron. Low mood since her mother's death in the spring: sad most days but sleeping, eating and working normally; PHQ-9 is 7. " +
        "A scanned letter from her previous neurologist, unsigned and undated, describes 'transition to secondary progressive MS'; today's exam and MRI are unchanged from 2023.",
      ros: "Neurologic: no new weakness, numbness or vision loss. Genitourinary: urgency as above, no dysuria. Psychiatric: low mood, no suicidal ideation.",
      physical_exam:
        "Alert, mildly flat affect. Mild left internuclear ophthalmoplegia (old). Strength 5/5; mild spasticity in the left leg with brisk left-sided reflexes. Gait normal; tandem slightly unsteady. " +
        "EDSS 2.5 (unchanged from 2023).",
      medications: "Ocrelizumab 600 mg IV every 6 months\nMirabegron 25 mg daily\nVitamin D3 2,000 units daily",
      labs: "MRI brain and cervical spine 09/2025: stable white matter lesions, no new or enhancing lesions\nPHQ-9: 7\nPost-void residual: 40 mL",
      assessment_plan:
        "1. Relapsing-remitting multiple sclerosis, clinically and radiologically stable on ocrelizumab. Next infusion 11/2025. No evidence of a progressive course: EDSS and MRI unchanged since 2023.\n" +
        "2. Neurogenic bladder due to MS with urge incontinence, improved on mirabegron; continue. Post-void residual normal.\n" +
        "3. Major depressive disorder, single episode, mild, after bereavement. Referred for counseling; no medication for now; repeat PHQ-9 in 6 weeks.",
      signature: "Electronically signed by Farid Haddad, MD on 10/14/2025 at 15:05.",
    },
    key: [
      {
        code: "G35.A",
        required: true,
        excerpt: "Relapsing-remitting multiple sclerosis, clinically and radiologically stable on ocrelizumab",
        rationale:
          "From 10/01/2025 (FY2026) multiple sclerosis has type-specific codes; relapsing-remitting is documented. Maps to HCC198.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "N31.9",
        required: true,
        excerpt: "Neurogenic bladder due to MS",
        rationale: "Neurogenic bladder, treated. No HCC.",
        trap: "none",
      },
      {
        code: "F32.0",
        required: true,
        excerpt: "Major depressive disorder, single episode, mild",
        rationale: "Episode and severity documented, with a plan. In V28 mild depression carries no HCC; only moderate or severe maps to HCC155.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "G35.D",
        whyWrong: "Since FY2026, MS codes carry the type, and relapsing-remitting is documented. Unspecified MS is less specific (same HCC198).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "G35.C0",
        whyWrong:
          "'Secondary progressive' comes only from an unsigned, undated outside letter, and the treating neurologist documents no progressive course. It cannot be coded.",
        trap: "signature_or_date_missing",
      },
      {
        code: "F32.1",
        whyWrong: "The provider documents mild severity (PHQ-9 7). Moderate would add an unsupported HCC155.",
        trap: "none",
      },
    ],
    expected: { hccs: [198], trimmed: [], raf: 0.647 },
  },

  {
    id: "00000000-0000-4000-8000-000000000130",
    title: "ALS with chronic respiratory failure and a feeding tube",
    specialty: "Neurology",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-06-03",
    patient: { name: "Barnaby Okwuosa", dob: "1961-04-28", sex: "male", mrn: "SYN-490426" },
    provider: "Lucia Ferreira-Klein, MD",
    facility: "Crestview Neurology Associates, ALS Clinic",
    sections: {
      hpi:
        "64-year-old male with amyotrophic lateral sclerosis (bulbar onset, diagnosed 2023), seen in the multidisciplinary ALS clinic with his wife. PEG tube placed 01/2025; " +
        "takes all nutrition and medication through it. Uses bilevel positive airway pressure (BiPAP) about 10 hours a night and with naps; off BiPAP he can sit and talk with his device for hours. " +
        "Morning headaches resolved after BiPAP was started. Speech now mostly unintelligible; uses an eye-gaze communication device.",
      ros: "Respiratory: orthopnea relieved by BiPAP, weak cough. GI: drooling, no vomiting. Neurologic: progressive arm weakness.",
      physical_exam:
        "Weight 158 lb (stable). Anarthric; tongue atrophy with fasciculations. Neck flexion 3/5. Arms 4/5 proximally, legs 4+/5. Brisk reflexes throughout. " +
        "Paradoxical abdominal breathing when supine. PEG site clean.",
      medications:
        "Riluzole 50 mg twice daily via PEG\nGlycopyrrolate 1 mg three times daily via PEG\nEnteral formula 1.5 kcal/mL, 5 cartons daily\nBiPAP IPAP 14 / EPAP 5 at night and with naps",
      labs:
        "FVC 41% predicted (55% in 01/2025)\nArterial blood gas on room air while awake 05/2025: pH 7.36, PaCO2 52 mmHg, PaO2 78 mmHg\nOvernight oximetry on BiPAP: no sustained desaturation",
      assessment_plan:
        "1. Amyotrophic lateral sclerosis, bulbar onset, progressing (FVC 41%). Continue riluzole; goals-of-care discussion held; he declines tracheostomy and invasive ventilation.\n" +
        "2. Chronic respiratory failure with hypercapnia due to neuromuscular weakness, PaCO2 52. Continue BiPAP at night and with naps, about 10 hours a day; not dependent on it while awake.\n" +
        "3. Gastrostomy status; PEG functioning. Continue enteral formula; weight stable.\n" +
        "4. Sialorrhea; continue glycopyrrolate.",
      signature: "Electronically signed by Lucia Ferreira-Klein, MD on 06/03/2025 at 13:50.",
    },
    key: [
      {
        code: "G12.21",
        required: true,
        excerpt: "Amyotrophic lateral sclerosis, bulbar onset, progressing",
        rationale: "ALS is specifically documented and treated. Maps to HCC190 (1.175).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "J96.12",
        required: true,
        excerpt: "Chronic respiratory failure with hypercapnia due to neuromuscular weakness",
        rationale: "Chronic and hypercapnic, supported by PaCO2 52 and treated with BiPAP. Maps to HCC213.",
        trap: "none",
      },
      {
        code: "Z93.1",
        required: true,
        excerpt: "Gastrostomy status; PEG functioning",
        rationale: "The feeding tube is in use and evaluated. Maps to HCC463.",
        trap: "none",
      },
      {
        code: "K11.7",
        required: false,
        excerpt: "Sialorrhea; continue glycopyrrolate",
        rationale: "Sialorrhea is a disturbance of salivary secretion, treated. Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "Z99.11",
        whyWrong:
          "Noninvasive BiPAP for part of the day is not dependence on a ventilator (respirator); the provider notes he is not dependent while awake. Z99.11 would add HCC211, which would also trim HCC213.",
        trap: "none",
      },
      {
        code: "G12.20",
        whyWrong: "ALS is documented. Motor neuron disease, unspecified is less specific (same HCC190).",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "J96.11",
        whyWrong: "The blood gas shows hypercapnia (PaCO2 52) with a normal PaO2; respiratory failure with hypoxia is not documented.",
        trap: "none",
      },
    ],
    expected: { hccs: [190, 213, 463], trimmed: [], raf: 2.218 },
  },

  // --- Psychiatry ------------------------------------------------------------
  {
    id: "00000000-0000-4000-8000-000000000131",
    title: "Recurrent depression follow-up",
    specialty: "Psychiatry",
    difficulty: 1,
    paymentYear: 2026,
    encounterDate: "2025-01-28",
    patient: { name: "Eleanor Fitzwilliam", dob: "1956-05-19", sex: "female", mrn: "SYN-500142" },
    provider: "Kwame Asante, MD",
    facility: "Juniper Behavioral Health",
    sections: {
      hpi:
        "68-year-old female with recurrent major depressive disorder (episodes in 2010 and 2018) and generalized anxiety disorder. The current episode began in October after retirement: " +
        "low mood most days, loss of interest in gardening, early waking and poor concentration; still cooks and sees friends weekly. PHQ-9 16 (11 in December). No suicidal ideation, plan or intent. " +
        "Worries about finances most days; GAD-7 12.",
      ros: "Constitutional: low energy, appetite slightly reduced, weight stable. Psychiatric: low mood, worry, no suicidal ideation, no psychotic symptoms. Sleep: early waking.",
      physical_exam:
        "Mental status: neatly dressed, psychomotor activity normal, mood 'down', affect constricted, thought process linear, no psychotic symptoms, denies suicidal or homicidal ideation, " +
        "insight and judgment good.",
      medications: "Escitalopram 10 mg daily (since 11/2024)",
      labs: "PHQ-9: 16\nGAD-7: 12\nTSH 11/2024: 1.9 mIU/L",
      assessment_plan:
        "1. Major depressive disorder, recurrent, moderate. PHQ-9 16 after 10 weeks of escitalopram 10 mg: increase to 20 mg daily; start weekly cognitive behavioral therapy; safety plan reviewed. " +
        "Follow up in 4 weeks.\n" +
        "2. Generalized anxiety disorder, moderate; expected to improve with the escitalopram increase and therapy.",
      signature: "Electronically signed by Kwame Asante, MD on 01/28/2025 at 11:55.",
    },
    key: [
      {
        code: "F33.1",
        required: true,
        excerpt: "Major depressive disorder, recurrent, moderate",
        rationale: "Episode (recurrent) and severity (moderate) documented and treated. Maps to HCC155.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "F41.1",
        required: true,
        excerpt: "Generalized anxiety disorder",
        rationale: "Assessed and treated. No HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "F32.A",
        whyWrong: "Depression, unspecified ignores the documented recurrent, moderate episode, and in V28 it carries no HCC.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "F32.1",
        whyWrong: "This is her third episode: recurrent (F33.-), not single episode. Same HCC155, but the wrong code.",
        trap: "none",
      },
      {
        code: "F33.41",
        whyWrong: "She is in an active moderate episode, not partial remission.",
        trap: "none",
      },
    ],
    expected: { hccs: [155], trimmed: [], raf: 0.299 },
  },

  {
    id: "00000000-0000-4000-8000-000000000132",
    title: "Bipolar depression and alcohol use disorder in remission",
    specialty: "Psychiatry",
    difficulty: 2,
    paymentYear: 2026,
    encounterDate: "2025-04-22",
    patient: { name: "Rupert Delacroix-Mbeki", dob: "1963-09-14", sex: "male", mrn: "SYN-500289" },
    provider: "Kwame Asante, MD",
    facility: "Juniper Behavioral Health",
    sections: {
      hpi:
        "61-year-old male with bipolar I disorder and alcohol use disorder, severe, in sustained remission (sober since 2019, attends AA weekly). Lithium maintenance for 10 years. " +
        "Three weeks of low mood, low energy, oversleeping and withdrawing from friends; no decreased need for sleep, racing thoughts or spending sprees. PHQ-9 15. No suicidal ideation. No alcohol cravings.",
      ros: "Constitutional: fatigue, hypersomnia. Psychiatric: low mood, no mania, no psychosis, no suicidal ideation. Neurologic: no tremor.",
      physical_exam:
        "Mental status: psychomotor slowing, mood 'flat', affect blunted, thought process linear, no psychotic symptoms, no suicidal or homicidal ideation, insight fair.",
      medications: "Lithium carbonate 900 mg nightly\nLamotrigine 25 mg daily (starting today, slow titration)",
      labs: "Lithium level 0.7 mmol/L\nTSH 2.3 mIU/L\nCreatinine 1.0 mg/dL; eGFR 80 mL/min/1.73m²",
      assessment_plan:
        "1. Bipolar disorder, current episode depressed, moderate, without psychotic features. Continue lithium 900 mg nightly; add lamotrigine 25 mg daily with slow titration; weekly therapy; " +
        "follow up in 2 weeks.\n" +
        "2. Alcohol dependence, in sustained remission since 2019. Continue AA; no medication needed.\n" +
        "3. Long-term current use of lithium; level therapeutic, thyroid and kidney function normal.",
      signature: "Electronically signed by Kwame Asante, MD on 04/22/2025 at 16:25.",
    },
    key: [
      {
        code: "F31.32",
        required: true,
        excerpt: "Bipolar disorder, current episode depressed, moderate",
        rationale: "A depressive episode in bipolar I disorder is coded as a bipolar episode, with severity. Maps to HCC154.",
        trap: "none",
      },
      {
        code: "F10.21",
        required: true,
        excerpt: "Alcohol dependence, in sustained remission since 2019",
        rationale: "Severe use disorder corresponds to dependence; sustained remission is documented and monitored. Maps to HCC139.",
        trap: "status_vs_history",
      },
      {
        code: "Z79.899",
        required: false,
        excerpt: "Long-term current use of lithium",
        rationale: "Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "F33.1",
        whyWrong: "Depression in someone with bipolar I disorder is a bipolar depressive episode (F31.3-), not major depressive disorder.",
        trap: "none",
      },
      {
        code: "F10.20",
        whyWrong: "The provider documents sustained remission, so the 'in remission' code applies.",
        trap: "status_vs_history",
      },
      {
        code: "F10.10",
        whyWrong: "A severe use disorder is documented, which corresponds to dependence. Alcohol abuse (F10.10) understates it and carries no HCC in V28.",
        trap: "none",
      },
    ],
    expected: { hccs: [139, 154], trimmed: [], raf: 0.593 },
  },

  {
    id: "00000000-0000-4000-8000-000000000133",
    title: "Schizoaffective disorder with opioid use disorder on buprenorphine",
    specialty: "Psychiatry",
    difficulty: 3,
    paymentYear: 2026,
    encounterDate: "2025-08-26",
    patient: { name: "Cassius Thorne-Whitaker", dob: "1967-02-03", sex: "male", mrn: "SYN-500437" },
    provider: "Ingrid Larsson-Obi, MD",
    facility: "Juniper Behavioral Health, Integrated Care Clinic",
    sections: {
      hpi:
        "58-year-old male with schizoaffective disorder, bipolar type, opioid use disorder in sustained remission on buprenorphine, type 2 diabetes and tobacco use, seen in the integrated care clinic. " +
        "No hospitalizations in 3 years. Hears a critical voice at times, less since clozapine; no command hallucinations. Mood stable, with no manic or depressive episode this year. " +
        "Last opioid use in 2020; on buprenorphine-naloxone since then, with appropriate urine drug screens. Smokes one pack a day.",
      ros: "Psychiatric: occasional critical voice, no mania, no depression, no suicidal ideation. Endocrine: no polyuria. Respiratory: morning cough.",
      physical_exam:
        "BP 128/80, HR 88, BMI 33.2. Mental status: casually dressed, mild psychomotor restlessness, mood 'okay', affect mildly blunted, thought process mostly linear with occasional tangentiality, " +
        "endorses an occasional critical voice, no delusions elicited, no suicidal or homicidal ideation.",
      medications: "Clozapine 300 mg nightly\nBuprenorphine-naloxone 16/4 mg sublingual daily\nMetformin 1000 mg twice daily",
      labs: "Absolute neutrophil count 3,100/µL\nClozapine level 410 ng/mL\nHbA1c 6.8%\nUrine drug screen: buprenorphine only",
      assessment_plan:
        "1. Schizoaffective disorder, bipolar type, stable on clozapine with mild residual auditory hallucinations. ANC 3,100; continue monthly ANC monitoring and clozapine 300 mg nightly.\n" +
        "2. Opioid use disorder, severe, in sustained remission on buprenorphine maintenance. Continue buprenorphine-naloxone 16/4 mg daily; PDMP reviewed.\n" +
        "3. Type 2 diabetes without complications, A1c 6.8% on metformin, with clozapine-associated weight gain. Continue metformin; dietitian referral.\n" +
        "4. Nicotine dependence, cigarettes, one pack per day; not ready to quit. Motivational interviewing done; cessation options offered.",
      signature: "Electronically signed by Ingrid Larsson-Obi, MD on 08/26/2025 at 10:15.",
    },
    key: [
      {
        code: "F25.0",
        required: true,
        excerpt: "Schizoaffective disorder, bipolar type",
        rationale: "Type documented, monitored and treated. Maps to HCC151, the top of the psychiatric hierarchy.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "F11.21",
        required: true,
        excerpt: "Opioid use disorder, severe, in sustained remission on buprenorphine maintenance",
        rationale: "Severe use disorder corresponds to dependence; sustained remission is documented, with maintenance therapy managed. Maps to HCC137.",
        trap: "status_vs_history",
      },
      {
        code: "E11.9",
        required: true,
        excerpt: "Type 2 diabetes without complications",
        rationale: "No complication is documented, and treatment is managed. Maps to HCC38.",
        trap: "none",
      },
      {
        code: "F17.210",
        required: true,
        excerpt: "Nicotine dependence, cigarettes",
        rationale: "Current dependence, counseled. No HCC.",
        trap: "none",
      },
      {
        code: "Z79.84",
        required: false,
        excerpt: "Continue metformin",
        rationale: "Long-term use of an oral hypoglycemic. Optional for scoring; no HCC.",
        trap: "none",
      },
    ],
    distractors: [
      {
        code: "F20.9",
        whyWrong: "Schizoaffective disorder is documented, not schizophrenia. Same HCC151, but the wrong diagnosis.",
        trap: "unspecified_when_specific_exists",
      },
      {
        code: "F11.20",
        whyWrong: "The provider documents sustained remission, so the 'in remission' code applies.",
        trap: "status_vs_history",
      },
      {
        code: "F31.9",
        whyWrong: "The mood symptoms are part of schizoaffective disorder, bipolar type. A separate bipolar disorder code is not assigned (and HCC151 would trim it anyway).",
        trap: "none",
      },
    ],
    expected: { hccs: [38, 137, 151], trimmed: [], raf: 1.101 },
  },
];

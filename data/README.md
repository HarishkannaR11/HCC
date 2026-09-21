# Reference data

`data/raw/` holds the official CMS/CDC source files. It is gitignored: the files
are large and freely re-downloadable from the URLs below. Nothing here is
scraped — every file is a direct download from cms.gov or ftp.cdc.gov.

| File | Feeds | Source |
| --- | --- | --- |
| `icd10cm-order-2026.txt` | `codes` | CDC FY2026 ICD-10-CM, [icd10cm-Code Descriptions-2026.zip](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2026/) |
| `ICD10_CC_mappings_CMS_HCC_2026_v28.csv` | `crosswalk` | CMS [2026 Midyear/Final Model Software (Python)](https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment/2026-model-software-icd-10-mappings) |
| `V28_CE_Relative_Factors.csv` | `hcc_weights` | same package |
| `V28_HCC_Hierarchies.csv` | `hcc_hierarchy` | same package |

The model-software package is the authoritative artifact: CMS ships the exact
mapping, hierarchy and coefficient tables its own risk-score software runs on,
so the crosswalk and the weights come from one internally consistent release
rather than three separately transcribed documents.

## Shape of the PY2026 V28 data

- 98,186 ICD-10-CM codes in FY2026, of which 74,719 are billable; the rest are
  tabular headers.
- 8,019 distinct codes map to an HCC, across 8,358 crosswalk rows.
- 115 HCC categories. The mapping, hierarchy and coefficient files agree
  exactly — no orphans in any direction.
- 339 codes map to two HCCs. Only 164 rows carry an age or sex edit, so most of
  those codes genuinely capture both categories at once (B37.7 lands in
  Septicemia *and* Opportunistic Infections). The rest are resolved by an edit,
  as with breast cancer splitting at age 50.
- 149 suppression pairs in the hierarchy.

### Two quirks the parser handles explicitly

**FY2026 added the QA0 block.** Twenty neurodevelopmental codes tied to genetic
variants (`QA0.0101`, SCN2A-related neurodevelopmental disorder, and so on) are
the first ICD-10-CM codes with a *letter* in the second position. The usual
`[A-Z][0-9]` shape rule rejects them, and they sort after `Q99`.

**575 duplicated crosswalk pairs.** CMS emits some `(code, HCC)` pairs twice,
split across complementary age bands — `age < 2` and `age >= 2` both landing on
the same HCC. The two rows together cover every age, so the mapping is
unconditional and collapses to one row with no age edit. The parser asserts the
bands really are complementary rather than deduplicating blindly, so a genuinely
conflicting duplicate in a future CMS release fails the build.

## How `disease_family` is derived

CMS does not publish a per-HCC family column anywhere in the model software, so
the parser computes one: **disease families are the connected components of the
suppression graph.** Two HCCs share a family exactly when one can knock the
other out — which is the grouping the RAF engine and the "weak families"
dashboard actually care about.

That yields **48 families**: 21 with more than one HCC, 27 singletons. This is
not the "26 disease families" figure from CMS's narrative documentation, which
has no machine-readable counterpart.

Naming is derived, never hand-authored:

1. If exactly one of CMS's own diagnosis categories (`V28_Diagnosis_Categories.csv`)
   fits inside a component, the component takes that token — `cancer`,
   `diabetes`, `hf`, `kidney`, `chr-lung`, `card-resp-fail`, `ulcer`, `sepsis`,
   `psychiatric`, `sub-use-disorder`.
2. Otherwise the component takes the label of its root, the lowest-numbered HCC,
   which V28 numbering makes the most severe member — `quadriplegia`,
   `intracranial-hemorrhage`, `hiv-aids`.

Rule 1 matters: naming purely by root label would call the diabetes family
"pancreas-transplant-status", since HCC35 heads that hierarchy. `NEURO_V28` is
deliberately not used — it spans five separate components, so the hierarchy
genuinely splits it.

A human-friendly display grouping can be added later as a separate column
without disturbing this one.

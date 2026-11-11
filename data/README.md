# Reference data

Reference data is versioned by payment year. One year is parsed from the
official CMS/CDC files into `data/processed/py<year>.json`
(`npm run data:build`), then loaded in one transaction (`npm run data:load`).

`data/raw/` holds the official source files. It is gitignored: the files are
large and freely re-downloadable from the URLs below. Nothing here is scraped;
every file is a direct download from cms.gov or ftp.cdc.gov.

| File (PY2026, V28) | Feeds | Source |
| --- | --- | --- |
| `icd10cm-order-2026.txt` | `icd10_codes` | CDC FY2026 ICD-10-CM, [icd10cm-Code Descriptions-2026.zip](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2026/) |
| `ICD10_CC_mappings_CMS_HCC_2026_v28.csv` | `icd_hcc_map` | CMS [2026 Midyear/Final Model Software](https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment/2026-model-software-icd-10-mappings) |
| `V28_CE_Relative_Factors.csv` | `hcc_categories` (label, `CNA` coefficient) | same package |
| `V28_HCC_Hierarchies.csv` | `hcc_hierarchy`, `hierarchy_group`, `hierarchy_rank` | same package |
| `V28_Diagnosis_Categories.csv` | `hierarchy_group` naming only | same package |

For another year, put its files in a folder and pass
`npm run data:build -- --year 2027 --model V28 --source data/raw/py2027`. The
file names follow the same pattern with the year and model substituted.

## The fixture

`data/fixtures/py2026/` is a small subset in exactly the same file formats:
92 ICD-10-CM codes (with their headers), 38 map rows and 45 HCCs, forming 11
complete hierarchy groups. It covers every code in the seed charts plus the
hierarchy cases the tests need, including the HCC180/182/253 partial order. It
exists so tests and local development run without the large official files.
Values come from public copies of the PY2026 V28 tables and agree with the
Phase 0 live verification (E11.9 → HCC38 0.166, I50.32 → HCC226 0.36,
C50.912 age split at 50).

```bash
npm run db:seed:fixture
```

## Shape of the PY2026 V28 data

- 98,186 ICD-10-CM codes in FY2026, of which 74,719 are billable; the rest are
  tabular headers.
- 8,019 distinct codes map to an HCC, across 8,358 map rows.
- 115 HCC categories. The mapping, hierarchy and coefficient files agree
  exactly, with no orphans in any direction.
- 339 codes map to two HCCs. Only 164 rows carry an age or sex edit, so most of
  those codes genuinely capture both categories at once (B37.7 lands in
  Septicemia *and* Opportunistic Infections). The rest are resolved by an edit,
  as with breast cancer splitting at age 50.
- 149 suppression pairs in the hierarchy.

### Quirks the parser handles explicitly

**FY2026 added the QA0 block.** Twenty neurodevelopmental codes tied to genetic
variants (`QA0.0101`, SCN2A-related neurodevelopmental disorder, and so on) are
the first ICD-10-CM codes with a *letter* in the second position.

**575 duplicated crosswalk pairs.** CMS emits some `(code, HCC)` pairs twice,
split across complementary age bands (`age < 2` and `age >= 2`, both on the
same HCC). The two rows together cover every age, so the mapping is
unconditional and collapses to one row. The parser asserts the bands really are
complementary, so a conflicting duplicate in a future release fails the build.

**The hierarchy is not always a chain.** Four of the 21 multi-HCC groups are
partial orders (e.g. HCC180 suppresses 182 and 253; neither suppresses the
other), and one chain is not transitive (62→63→202 without 62→202). The
explicit pairs are therefore stored and used for trimming. Group and rank are
derived for display.

## How `hierarchy_group` and `hierarchy_rank` are derived

CMS publishes no per-HCC family column, so groups are **the connected
components of the suppression graph**: two HCCs share a group exactly when one
can knock the other out. That yields 48 groups (21 multi-HCC, 27 singletons).

Naming is derived, never hand-authored:

1. If exactly one of CMS's diagnosis categories (`V28_Diagnosis_Categories.csv`)
   fits inside a component, the component takes that token: `cancer`,
   `diabetes`, `hf`, `kidney`, `chr-lung` …
2. Otherwise it takes the label of its lowest-numbered HCC: `quadriplegia`,
   `intracranial-hemorrhage`, `hiv-aids`.

`hierarchy_rank` is 1 for an HCC nothing suppresses, otherwise one more than
its highest-ranked suppressor. In a chain this is simply the position
(diabetes: 35=1, 36=2, 37=3, 38=4).

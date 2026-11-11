import { ActionForm, ConfirmSubmit, FieldErrorText } from "@/components/action-form";
import { SubmitButton } from "@/components/form-parts";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  DIFFICULTY_LABELS,
  SECTION_TYPES,
  SPECIALTY_SUGGESTIONS,
  TRAP_TYPES,
  sectionLabel,
  type ChartStatus,
  type TrapType,
} from "@/lib/charts/constants";
import type { ReadinessCheck } from "@/lib/charts/readiness";
import type { Database } from "@/lib/supabase/database.types";
import {
  addAnswerKeyItem,
  addDistractor,
  addSection,
  deleteAnswerKeyItem,
  deleteChart,
  deleteDistractor,
  deleteSection,
  moveSection,
  setChartStatus,
  updateAnswerKeyItem,
  updateChartDetails,
  updateDistractor,
  updateSection,
} from "../actions";

type Tables = Database["public"]["Tables"];
type ChartRow = Tables["charts"]["Row"];
type SectionRow = Tables["chart_sections"]["Row"];
type KeyRow = Tables["answer_key_items"]["Row"];
type DistractorRow = Tables["distractors"]["Row"];

export interface CodeView {
  description: string;
  /** HCCs this code captures for this chart's patient, after CMS age/sex edits. */
  hccs: { code: string; label: string; raf: number }[];
}

const linkButton = buttonVariants({ variant: "link", size: "sm" });
const dangerLink = `${linkButton} text-danger-ink`;

// --- header actions ---------------------------------------------------------

export function ChartActions({ chartId, status }: { chartId: string; status: ChartStatus }) {
  const next = status === "published" ? "draft" : "published";
  return (
    <div className="flex items-start gap-3">
      <ActionForm action={setChartStatus} className="flex max-w-sm flex-col items-end gap-2">
        <input type="hidden" name="chartId" value={chartId} />
        <input type="hidden" name="status" value={next} />
        <SubmitButton variant={next === "published" ? "default" : "outline"} pendingLabel="Updating…">
          {next === "published" ? "Publish" : "Unpublish"}
        </SubmitButton>
      </ActionForm>
      <ActionForm action={deleteChart} className="flex max-w-sm flex-col items-end gap-2">
        <input type="hidden" name="chartId" value={chartId} />
        <ConfirmSubmit
          message="Delete this chart, its text, answer key and distractors? Attempts on it are deleted too."
          className={buttonVariants({ variant: "outline" })}
        >
          Delete
        </ConfirmSubmit>
      </ActionForm>
    </div>
  );
}

// --- readiness --------------------------------------------------------------

export function ReadinessPanel({ checks }: { checks: readonly ReadinessCheck[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish checklist</CardTitle>
        <CardDescription>Blocking items must pass before learners can see the chart.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1.5 text-[13px] sm:grid-cols-2">
          {checks.map((check) => (
            <li key={check.id} className="flex gap-2">
              <span aria-hidden className={check.ok ? "text-accent" : check.blocking ? "text-danger" : "text-warn-ink"}>
                {check.ok ? "✓" : check.blocking ? "✕" : "!"}
              </span>
              <span>
                {check.label}
                {!check.blocking ? <span className="text-muted"> (advisory)</span> : null}
                {!check.ok && check.detail ? <span className="block text-muted">{check.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// --- details ----------------------------------------------------------------

function TextField({
  name,
  label,
  defaultValue,
  type = "text",
  list,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  list?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} list={list} required />
      <FieldErrorText name={name} />
    </div>
  );
}

export function DetailsPanel({
  chart,
  paymentYears,
  yearLocked,
}: {
  chart: ChartRow;
  paymentYears: { year: number; hcc_model_version: string }[];
  yearLocked: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chart details</CardTitle>
        <CardDescription>The synthetic header the learner sees above the note.</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={updateChartDetails} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="chartId" value={chart.id} />
          <TextField name="title" label="Title" defaultValue={chart.title} />
          <TextField name="specialty" label="Specialty" defaultValue={chart.specialty} list="specialties" />
          <datalist id="specialties">
            {SPECIALTY_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="difficulty">Difficulty</Label>
            <NativeSelect id="difficulty" name="difficulty" defaultValue={String(chart.difficulty)}>
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d} · {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentYear">Payment year</Label>
            {yearLocked ? <input type="hidden" name="paymentYear" value={chart.payment_year} /> : null}
            <NativeSelect
              id="paymentYear"
              name={yearLocked ? undefined : "paymentYear"}
              defaultValue={String(chart.payment_year)}
              disabled={yearLocked}
            >
              {paymentYears.map((y) => (
                <option key={y.year} value={y.year}>
                  PY{y.year} · {y.hcc_model_version}
                </option>
              ))}
            </NativeSelect>
            {yearLocked ? (
              <p className="text-[12px] text-muted">Locked: the answer key was validated against this year.</p>
            ) : null}
          </div>
          <TextField name="encounterDate" label="Encounter date" type="date" defaultValue={chart.encounter_date} />
          <TextField name="facilityName" label="Facility (synthetic)" defaultValue={chart.facility_name} />
          <TextField name="patientName" label="Patient name (synthetic)" defaultValue={chart.patient_name} />
          <TextField name="patientDob" label="Date of birth (synthetic)" type="date" defaultValue={chart.patient_dob} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="patientSex">Sex</Label>
            <NativeSelect id="patientSex" name="patientSex" defaultValue={chart.patient_sex}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </NativeSelect>
          </div>
          <TextField name="patientMrn" label="MRN (synthetic)" defaultValue={chart.patient_mrn} />
          <TextField name="providerName" label="Provider (synthetic)" defaultValue={chart.provider_name} />

          <div className="sm:col-span-2 lg:col-span-3">
            <Alert variant="warn" className="flex flex-col gap-2">
              <label className="flex items-start gap-2 font-medium">
                <input type="checkbox" name="isSynthetic" defaultChecked={chart.is_synthetic} className="mt-1" />
                This chart is entirely synthetic.
              </label>
              <span className="text-[13px]">
                Every name, date of birth, MRN, provider, facility and sentence in it is invented. Never enter or
                paste real patient data — not from your employer, and not redacted. A real chart is protected
                health information.
              </span>
              <FieldErrorText name="isSynthetic" />
            </Alert>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <SubmitButton>Save details</SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

// --- sections ---------------------------------------------------------------

function SectionTypeSelect({ id, defaultValue }: { id: string; defaultValue?: string }) {
  return (
    <NativeSelect id={id} name="sectionType" defaultValue={defaultValue ?? "hpi"} className="w-56">
      {SECTION_TYPES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function SectionsPanel({ chartId, sections }: { chartId: string; sections: SectionRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chart text</CardTitle>
        <CardDescription>
          Sections render top to bottom in this order. Blank lines become paragraph breaks.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {sections.map((section, index) => (
          <div key={section.id} className="flex flex-col gap-2 rounded-card border border-border bg-surface-alt p-3">
            <ActionForm action={updateSection} className="flex flex-col gap-2">
              <input type="hidden" name="chartId" value={chartId} />
              <input type="hidden" name="sectionId" value={section.id} />
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-muted">{index + 1}.</span>
                <Label htmlFor={`type-${section.id}`} className="sr-only">
                  Section type
                </Label>
                <SectionTypeSelect id={`type-${section.id}`} defaultValue={section.section_type} />
              </div>
              <Label htmlFor={`content-${section.id}`} className="sr-only">
                {sectionLabel(section.section_type)} text
              </Label>
              <Textarea
                id={`content-${section.id}`}
                name="content"
                defaultValue={section.content}
                rows={Math.min(16, Math.max(3, Math.ceil(section.content.length / 110)))}
                className="font-serif text-[15px] leading-relaxed"
              />
              <FieldErrorText name="content" />
              <div>
                <SubmitButton size="sm">Save section</SubmitButton>
              </div>
            </ActionForm>
            <div className="flex items-center gap-1">
              {(["up", "down"] as const).map((direction) => (
                <ActionForm key={direction} action={moveSection} showMessage={false}>
                  <input type="hidden" name="chartId" value={chartId} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value={direction} />
                  <button
                    type="submit"
                    className={linkButton}
                    disabled={direction === "up" ? index === 0 : index === sections.length - 1}
                  >
                    Move {direction}
                  </button>
                </ActionForm>
              ))}
              <ActionForm action={deleteSection} showMessage={false}>
                <input type="hidden" name="chartId" value={chartId} />
                <input type="hidden" name="rowId" value={section.id} />
                <ConfirmSubmit message="Delete this section?" className={dangerLink}>
                  Delete
                </ConfirmSubmit>
              </ActionForm>
            </div>
          </div>
        ))}

        <ActionForm action={addSection} resetOnSuccess className="flex flex-col gap-2 border-t border-border pt-4">
          <input type="hidden" name="chartId" value={chartId} />
          <div className="flex items-center gap-2">
            <Label htmlFor="new-section-type">Add section</Label>
            <SectionTypeSelect id="new-section-type" />
          </div>
          <Textarea name="content" aria-label="New section text" rows={4} className="font-serif text-[15px]" />
          <FieldErrorText name="content" />
          <div>
            <SubmitButton size="sm" pendingLabel="Adding…">
              Add section
            </SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

// --- answer key & distractors -----------------------------------------------

function TrapSelect({ id, defaultValue }: { id: string; defaultValue?: TrapType }) {
  return (
    <NativeSelect id={id} name="trapType" defaultValue={defaultValue ?? "none"}>
      {TRAP_TYPES.map((t) => (
        <option key={t.value} value={t.value} title={t.description}>
          {t.label}
        </option>
      ))}
    </NativeSelect>
  );
}

function CodeSummary({ code, view }: { code: string; view: CodeView | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[15px] font-semibold">{code}</span>
      <span className="text-[13px] text-muted">{view?.description ?? "Not in this payment year's code set"}</span>
      <div className="flex flex-wrap gap-1">
        {view && view.hccs.length > 0 ? (
          view.hccs.map((h) => (
            <Badge key={h.code} title={h.label}>
              {h.code} · {h.raf.toFixed(3)}
            </Badge>
          ))
        ) : (
          <Badge variant="outline">No HCC</Badge>
        )}
      </div>
    </div>
  );
}

export function AnswerKeyPanel({
  chartId,
  items,
  codes,
}: {
  chartId: string;
  items: KeyRow[];
  codes: Map<string, CodeView>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Answer key</CardTitle>
        <CardDescription>
          Hidden from learners until they submit. HCC and coefficient are shown for this patient after CMS age/sex
          edits; hierarchy trimming is applied when the chart is scored.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.length === 0 ? <p className="text-sm text-muted">No codes yet.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-card border border-border p-3 md:grid-cols-[220px_1fr]">
            <div className="flex flex-col gap-2">
              <CodeSummary code={item.icd10_code} view={codes.get(item.icd10_code)} />
              <ActionForm action={deleteAnswerKeyItem} showMessage={false}>
                <input type="hidden" name="chartId" value={chartId} />
                <input type="hidden" name="rowId" value={item.id} />
                <ConfirmSubmit message={`Remove ${item.icd10_code} from the answer key?`} className={dangerLink}>
                  Remove
                </ConfirmSubmit>
              </ActionForm>
            </div>
            <ActionForm action={updateAnswerKeyItem} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="chartId" value={chartId} />
              <input type="hidden" name="itemId" value={item.id} />
              <KeyItemFields idPrefix={item.id} item={item} />
              <div className="sm:col-span-2">
                <SubmitButton size="sm">Save</SubmitButton>
              </div>
            </ActionForm>
          </div>
        ))}

        <ActionForm action={addAnswerKeyItem} resetOnSuccess className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <input type="hidden" name="chartId" value={chartId} />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="new-key-code">Add code</Label>
            <Input id="new-key-code" name="icd10Code" placeholder="E11.22" className="max-w-40 font-mono" />
            <FieldErrorText name="icd10Code" />
          </div>
          <KeyItemFields idPrefix="new-key" />
          <div className="sm:col-span-2">
            <SubmitButton size="sm" pendingLabel="Adding…">
              Add to answer key
            </SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

function KeyItemFields({ idPrefix, item }: { idPrefix: string; item?: KeyRow }) {
  return (
    <>
      <label className="flex items-center gap-2 text-[13px] font-medium">
        <input type="checkbox" name="isRequired" defaultChecked={item?.is_required ?? true} />
        Required
        <span className="font-normal text-muted">(untick for acceptable-but-optional)</span>
      </label>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-trap`}>Trap</Label>
        <TrapSelect id={`${idPrefix}-trap`} defaultValue={item?.trap_type} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-excerpt`}>Supporting excerpt</Label>
        <Textarea
          id={`${idPrefix}-excerpt`}
          name="supportingExcerpt"
          defaultValue={item?.supporting_excerpt ?? ""}
          rows={2}
          placeholder="Copied verbatim from the chart text"
        />
        <FieldErrorText name="supportingExcerpt" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-rationale`}>Rationale</Label>
        <Textarea id={`${idPrefix}-rationale`} name="rationale" defaultValue={item?.rationale ?? ""} rows={3} />
        <FieldErrorText name="rationale" />
      </div>
    </>
  );
}

export function DistractorsPanel({
  chartId,
  items,
  codes,
}: {
  chartId: string;
  items: DistractorRow[];
  codes: Map<string, CodeView>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distractors</CardTitle>
        <CardDescription>Plausible wrong codes. Learners see why each is wrong after they submit.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.length === 0 ? <p className="text-sm text-muted">No distractors yet.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-card border border-border p-3 md:grid-cols-[220px_1fr]">
            <div className="flex flex-col gap-2">
              <CodeSummary code={item.icd10_code} view={codes.get(item.icd10_code)} />
              <ActionForm action={deleteDistractor} showMessage={false}>
                <input type="hidden" name="chartId" value={chartId} />
                <input type="hidden" name="rowId" value={item.id} />
                <ConfirmSubmit message={`Remove distractor ${item.icd10_code}?`} className={dangerLink}>
                  Remove
                </ConfirmSubmit>
              </ActionForm>
            </div>
            <ActionForm action={updateDistractor} className="flex flex-col gap-3">
              <input type="hidden" name="chartId" value={chartId} />
              <input type="hidden" name="distractorId" value={item.id} />
              <DistractorFields idPrefix={item.id} item={item} />
              <div>
                <SubmitButton size="sm">Save</SubmitButton>
              </div>
            </ActionForm>
          </div>
        ))}

        <ActionForm action={addDistractor} resetOnSuccess className="flex flex-col gap-3 border-t border-border pt-4">
          <input type="hidden" name="chartId" value={chartId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-distractor-code">Add distractor</Label>
            <Input id="new-distractor-code" name="icd10Code" placeholder="E11.9" className="max-w-40 font-mono" />
            <FieldErrorText name="icd10Code" />
          </div>
          <DistractorFields idPrefix="new-distractor" />
          <div>
            <SubmitButton size="sm" pendingLabel="Adding…">
              Add distractor
            </SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

function DistractorFields({ idPrefix, item }: { idPrefix: string; item?: DistractorRow }) {
  return (
    <>
      <div className="flex max-w-xs flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-trap`}>Trap</Label>
        <TrapSelect id={`${idPrefix}-trap`} defaultValue={item?.trap_type} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-why`}>Why it is wrong</Label>
        <Textarea id={`${idPrefix}-why`} name="whyWrong" defaultValue={item?.why_wrong ?? ""} rows={3} />
        <FieldErrorText name="whyWrong" />
      </div>
    </>
  );
}

"use client";

import { useActionState } from "react";
import { createChart, updateChart, type ActionState } from "@/app/admin/charts/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { DIFFICULTY_LABELS, SPECIALTIES } from "@/lib/charts/constants";
import type { ChartRow } from "@/lib/charts/admin-data";
import { Field, FormStatus } from "./field";
import { submitKeepingValues } from "./keep-values";

type ChartMeta = Pick<
  ChartRow,
  | "id"
  | "title"
  | "specialty"
  | "difficulty"
  | "payment_year"
  | "encounter_date"
  | "patient_name"
  | "patient_dob"
  | "patient_sex"
  | "patient_mrn"
  | "provider_name"
  | "facility_name"
>;

export function ChartMetaForm({ chart, years }: { chart?: ChartMeta; years: number[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(chart ? updateChart : createChart, {});
  const err = state.fieldErrors ?? {};
  const invalid = (name: string) => (err[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  return (
    <form action={formAction} onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-5" noValidate>
      {chart ? <input type="hidden" name="chart_id" value={chart.id} /> : null}

      <Alert variant="warn">
        <strong>Synthetic charts only.</strong> Every patient name, date of birth, MRN, provider and facility on a chart
        must be invented. Never enter or paste real patient information, in any environment.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="title" label="Title" error={err.title} className="sm:col-span-2">
          <Input id="title" name="title" defaultValue={chart?.title} required maxLength={200} {...invalid("title")} />
        </Field>
        <Field id="specialty" label="Specialty" error={err.specialty}>
          <NativeSelect id="specialty" name="specialty" defaultValue={chart?.specialty ?? ""} required {...invalid("specialty")}>
            <option value="" disabled>
              Choose…
            </option>
            {SPECIALTIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="difficulty" label="Difficulty" error={err.difficulty}>
          <NativeSelect id="difficulty" name="difficulty" defaultValue={chart?.difficulty ?? 1} {...invalid("difficulty")}>
            {([1, 2, 3] as const).map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="payment_year" label="Payment year" error={err.payment_year} hint="Codes are validated against this year.">
          <NativeSelect
            id="payment_year"
            name="payment_year"
            defaultValue={chart?.payment_year ?? years[0]}
            {...invalid("payment_year")}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                PY{y}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="encounter_date" label="Date of service" error={err.encounter_date} hint="PY2026 uses 2025 dates of service.">
          <Input id="encounter_date" name="encounter_date" type="date" defaultValue={chart?.encounter_date} required {...invalid("encounter_date")} />
        </Field>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2 border border-border rounded-card p-4">
        <legend className="px-1 text-[13px] font-semibold">Synthetic patient and encounter</legend>
        <Field id="patient_name" label="Patient name (invented)" error={err.patient_name}>
          <Input id="patient_name" name="patient_name" defaultValue={chart?.patient_name} required {...invalid("patient_name")} />
        </Field>
        <Field id="patient_mrn" label="MRN (synthetic)" error={err.patient_mrn} hint="Must start with SYN-, e.g. SYN-104233.">
          <Input id="patient_mrn" name="patient_mrn" defaultValue={chart?.patient_mrn ?? "SYN-"} required {...invalid("patient_mrn")} />
        </Field>
        <Field id="patient_dob" label="Date of birth (invented)" error={err.patient_dob} hint="Age drives CMS age edits.">
          <Input id="patient_dob" name="patient_dob" type="date" defaultValue={chart?.patient_dob} required {...invalid("patient_dob")} />
        </Field>
        <Field id="patient_sex" label="Sex" error={err.patient_sex} hint="Drives CMS sex edits.">
          <NativeSelect id="patient_sex" name="patient_sex" defaultValue={chart?.patient_sex ?? ""} required {...invalid("patient_sex")}>
            <option value="" disabled>
              Choose…
            </option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </NativeSelect>
        </Field>
        <Field id="provider_name" label="Provider (invented)" error={err.provider_name}>
          <Input id="provider_name" name="provider_name" defaultValue={chart?.provider_name} required {...invalid("provider_name")} />
        </Field>
        <Field id="facility_name" label="Facility (invented)" error={err.facility_name}>
          <Input id="facility_name" name="facility_name" defaultValue={chart?.facility_name} required {...invalid("facility_name")} />
        </Field>
      </fieldset>

      <label className="flex items-start gap-2.5 text-[13px]">
        <input
          type="checkbox"
          name="confirm_synthetic"
          defaultChecked={Boolean(chart)}
          required
          className="mt-0.5 size-4 accent-[var(--color-accent)]"
          aria-describedby={err.confirm_synthetic ? "confirm_synthetic-error" : undefined}
        />
        <span>
          I confirm this chart is entirely synthetic and contains no real patient information.
          {err.confirm_synthetic ? (
            <span id="confirm_synthetic-error" className="block text-xs text-destructive">
              {err.confirm_synthetic}
            </span>
          ) : null}
        </span>
      </label>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : chart ? "Save details" : "Create draft chart"}
        </Button>
        <FormStatus error={state.error} ok={state.ok} />
      </div>
    </form>
  );
}

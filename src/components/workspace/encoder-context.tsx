"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { Patient } from "@/lib/hcc/types";
import type { HierarchyRef } from "@/lib/scoring/reference";
import type { EncoderState, EncoderStore } from "@/lib/workspace/store";

export interface EncoderContextValue {
  store: EncoderStore;
  chartId: string;
  paymentYear: number;
  /** Age at the encounter and sex, for the CMS edits. */
  patient: Patient;
  hierarchy: HierarchyRef;
}

export const EncoderContext = createContext<EncoderContextValue | null>(null);

export function useEncoderContext(): EncoderContextValue {
  const value = useContext(EncoderContext);
  if (!value) throw new Error("Encoder components must render inside <Encoder>.");
  return value;
}

/** Subscribe to one slice of this encoder's state. */
export function useEncoder<T>(selector: (state: EncoderState) => T): T {
  return useStore(useEncoderContext().store, selector);
}

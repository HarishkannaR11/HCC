/**
 * The seed chart library: three charts per specialty, one at each difficulty.
 * Every chart is synthetic; see the header of each file.
 */
import type { SeedChart } from "../types";
import { CARDIOMETABOLIC_CHARTS } from "./cardiometabolic";
import { PRIMARY_CARE_CHARTS } from "./primary-care";
import { SPECIALTY_CHARTS } from "./specialty";

export const LIBRARY_CHARTS: SeedChart[] = [...PRIMARY_CARE_CHARTS, ...CARDIOMETABOLIC_CHARTS, ...SPECIALTY_CHARTS];

// UK undergraduate degree classification from a credit-weighted average.
// Boundaries used by most UK universities: First 70+, 2:1 60-69, 2:2 50-59, Third 40-49.
// Weightings and borderline rules differ between universities, so they are options here.

export interface Module {
  name?: string;
  credits: number;
  mark: number;
}

export type ClassName = "First" | "Upper second (2:1)" | "Lower second (2:2)" | "Third" | "Fail";

export const BOUNDARIES: { min: number; name: ClassName; short: string }[] = [
  { min: 70, name: "First", short: "1st" },
  { min: 60, name: "Upper second (2:1)", short: "2:1" },
  { min: 50, name: "Lower second (2:2)", short: "2:2" },
  { min: 40, name: "Third", short: "3rd" },
  { min: 0, name: "Fail", short: "Fail" },
];

/** Common weightings, as [penultimate year, final year] percentages. */
export const WEIGHTINGS = [
  { id: "0-100", label: "Final year only (0:100)", w: [0, 100] },
  { id: "20-80", label: "20:80", w: [20, 80] },
  { id: "25-75", label: "25:75 (1:3)", w: [25, 75] },
  { id: "30-70", label: "30:70", w: [30, 70] },
  { id: "33-67", label: "1:2 (one third : two thirds)", w: [100 / 3, 200 / 3] },
  { id: "40-60", label: "40:60", w: [40, 60] },
  { id: "50-50", label: "50:50", w: [50, 50] },
] as const;

export type Rounding = "none" | "1dp" | "whole";

const EPS = 1e-9;

function isValid(m: Module): boolean {
  return Number.isFinite(m.credits) && m.credits > 0 && Number.isFinite(m.mark) && m.mark >= 0 && m.mark <= 100;
}

/** Credit-weighted average of valid modules, or null when there are none. */
export function weightedAverage(modules: Module[]): number | null {
  const ok = modules.filter(isValid);
  const credits = ok.reduce((s, m) => s + m.credits, 0);
  if (credits === 0) return null;
  return ok.reduce((s, m) => s + m.credits * m.mark, 0) / credits;
}

export function totalCredits(modules: Module[]): number {
  return modules.filter(isValid).reduce((s, m) => s + m.credits, 0);
}

export function applyRounding(mark: number, rounding: Rounding): number {
  // Round half up, after removing float noise such as 69.49999999999999
  const clean = Math.round(mark * 1e6) / 1e6;
  if (rounding === "whole") return Math.floor(clean + 0.5);
  if (rounding === "1dp") return Math.floor(clean * 10 + 0.5) / 10;
  return clean;
}

export function classify(mark: number): (typeof BOUNDARIES)[number] {
  return BOUNDARIES.find((b) => mark + EPS >= b.min)!;
}

export interface DegreeResult {
  year2: number | null;
  year3: number | null;
  /** Weighted overall average before rounding */
  overall: number;
  /** Mark after the chosen rounding rule, used for the class */
  rounded: number;
  classification: ClassName;
  short: string;
  /** Set when the mark is within `borderline` marks below the next class up */
  borderlineFor: ClassName | null;
}

/**
 * weights = [penultimate, final] in any scale (e.g. [30, 70] or [1, 2]).
 * Returns null if a year with weight > 0 has no valid modules.
 */
export function degreeResult(
  year2: Module[],
  year3: Module[],
  weights: readonly [number, number] | readonly number[],
  opts: { rounding?: Rounding; borderline?: number } = {},
): DegreeResult | null {
  const [w2, w3] = weights;
  if (!(w2 >= 0 && w3 >= 0) || w2 + w3 <= 0) throw new RangeError("Weights must be positive");
  const a2 = weightedAverage(year2);
  const a3 = weightedAverage(year3);
  if ((w2 > 0 && a2 === null) || (w3 > 0 && a3 === null)) return null;

  const overall = ((a2 ?? 0) * w2 + (a3 ?? 0) * w3) / (w2 + w3);
  const rounded = applyRounding(overall, opts.rounding ?? "none");
  const cls = classify(rounded);
  const zone = opts.borderline ?? 2;
  const idx = BOUNDARIES.indexOf(cls);
  const next = idx > 0 ? BOUNDARIES[idx - 1] : null;
  const borderlineFor = next && zone > 0 && next.min - rounded <= zone + EPS ? next.name : null;

  return { year2: a2, year3: a3, overall, rounded, classification: cls.name, short: cls.short, borderlineFor };
}

export type TargetResult =
  | { status: "needed"; mark: number }
  | { status: "secured" }
  | { status: "impossible"; mark: number }
  | { status: "no-credits-left" };

/**
 * Average mark needed on the final-year credits you have not finished yet to reach `target`
 * overall. Assumes the penultimate year is complete.
 */
export function markNeeded(
  year2: Module[],
  year3Done: Module[],
  finalYearCredits: number,
  weights: readonly number[],
  target: number,
): TargetResult {
  const [w2, w3] = weights;
  const total = w2 + w3;
  const a2 = weightedAverage(year2) ?? 0;
  const doneCredits = totalCredits(year3Done);
  const left = finalYearCredits - doneCredits;
  if (left <= 0) return { status: "no-credits-left" };
  if (w3 <= 0) return { status: "no-credits-left" };
  const doneSum = year3Done.filter(isValid).reduce((s, m) => s + m.credits * m.mark, 0);
  // target = (a2*w2 + w3 * (doneSum + x*left) / finalYearCredits) / total
  const neededFinalAvg = (target * total - a2 * w2) / w3;
  const x = (neededFinalAvg * finalYearCredits - doneSum) / left;
  const mark = Math.ceil(x * 10 - EPS) / 10; // round UP to 0.1 so it is enough
  if (mark <= 0) return { status: "secured" };
  if (mark > 100) return { status: "impossible", mark };
  return { status: "needed", mark };
}

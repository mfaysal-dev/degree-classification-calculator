"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { BOUNDARIES, WEIGHTINGS, degreeResult, markNeeded, totalCredits, type Module, type Rounding } from "@/lib/degree";

interface Row { id: number; name: string; credits: string; mark: string }
interface Saved { y2: Row[]; y3: Row[]; weighting: string; custom: [string, string]; rounding: Rounding; finalCredits: string }

const KEY = "degree-calc-v1";
let nextId = 1;
const row = (name = "", credits = "20", mark = ""): Row => ({ id: nextId++, name, credits, mark });

const DEFAULT: Saved = {
  y2: [row("Module 1", "20", "62"), row("Module 2", "20", "58"), row("Module 3", "40", "65"), row("Module 4", "40", "61")],
  y3: [row("Dissertation", "40", "68"), row("Module 6", "20", "72"), row("Module 7", "20", "")],
  weighting: "30-70",
  custom: ["30", "70"],
  rounding: "none",
  finalCredits: "120",
};

const toModules = (rows: Row[]): Module[] =>
  rows.filter((r) => r.mark.trim() !== "" && r.credits.trim() !== "").map((r) => ({ name: r.name, credits: Number(r.credits), mark: Number(r.mark) }));

const fmt = (n: number | null) => (n === null ? "–" : (Math.round(n * 100) / 100).toFixed(2));

function YearTable({ title, rows, onChange, idp }: { title: string; rows: Row[]; onChange: (rows: Row[]) => void; idp: string }) {
  const set = (id: number, patch: Partial<Row>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <fieldset className="card">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-lg font-bold" aria-hidden="true">{title}</h2>
      <div className="mt-3 hidden grid-cols-[1fr_5.5rem_5.5rem_2.75rem] gap-2 text-sm font-medium text-slate-600 sm:grid">
        <span>Module</span><span>Credits</span><span>Mark %</span><span className="sr-only">Remove</span>
      </div>
      <ul className="mt-2 space-y-3 sm:space-y-2">
        {rows.map((r, i) => {
          const bad = r.mark !== "" && !(Number(r.mark) >= 0 && Number(r.mark) <= 100);
          return (
            <li key={r.id} className="grid grid-cols-[1fr_1fr_2.75rem] gap-2 sm:grid-cols-[1fr_5.5rem_5.5rem_2.75rem]">
              <label className="col-span-3 sm:col-span-1">
                <span className="sr-only">Module {i + 1} name</span>
                <input className="field" value={r.name} placeholder={`Module ${i + 1}`} onChange={(e) => set(r.id, { name: e.target.value })} />
              </label>
              <label>
                <span className="text-xs text-slate-600 sm:sr-only">Credits for module {i + 1}</span>
                <input className="field" inputMode="numeric" value={r.credits} onChange={(e) => set(r.id, { credits: e.target.value })} />
              </label>
              <label>
                <span className="text-xs text-slate-600 sm:sr-only">Mark for module {i + 1} (%)</span>
                <input className="field" inputMode="decimal" value={r.mark} placeholder="–" aria-invalid={bad}
                  onChange={(e) => set(r.id, { mark: e.target.value })} />
              </label>
              <button type="button" className="self-end rounded-lg border border-slate-300 py-2.5 text-slate-600 hover:bg-slate-100"
                aria-label={`Remove module ${i + 1}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))}>×</button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent)]"
          onClick={() => onChange([...rows, row()])}>+ Add module</button>
        <span id={`${idp}-credits`} className="text-sm text-slate-600">{totalCredits(toModules(rows))} credits with marks</span>
      </div>
    </fieldset>
  );
}

export function DegreeCalculator() {
  const id = useId();
  const [s, setS] = useState<Saved>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw) as Saved;
        const fix = (rows: Row[]) => rows.map((r) => ({ ...r, id: nextId++ }));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved marks once after hydration
        setS({ ...DEFAULT, ...data, y2: fix(data.y2 ?? []), y3: fix(data.y3 ?? []) });
      }
    } catch { /* broken or blocked storage: keep defaults */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s, loaded]);

  const weights = useMemo<number[]>(() => {
    if (s.weighting === "custom") return s.custom.map(Number);
    return [...(WEIGHTINGS.find((w) => w.id === s.weighting)?.w ?? [30, 70])];
  }, [s.weighting, s.custom]);
  const weightsOk = weights.every((w) => Number.isFinite(w) && w >= 0) && weights[0] + weights[1] > 0;

  const y2 = toModules(s.y2);
  const y3 = toModules(s.y3);
  const result = weightsOk ? degreeResult(y2, y3, weights, { rounding: s.rounding }) : null;
  const finalCredits = Number(s.finalCredits);
  const targets = weightsOk && finalCredits > 0 && (weights[0] === 0 || y2.length > 0)
    ? BOUNDARIES.slice(0, 3).map((b) => ({ b, r: markNeeded(y2, y3, finalCredits, weights, b.min) }))
    : [];

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${id}-w`}>Year weighting (2nd : final)</label>
          <select id={`${id}-w`} className="field" value={s.weighting} onChange={(e) => setS({ ...s, weighting: e.target.value })}>
            {WEIGHTINGS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${id}-r`}>Rounding before classifying</label>
          <select id={`${id}-r`} className="field" value={s.rounding} onChange={(e) => setS({ ...s, rounding: e.target.value as Rounding })}>
            <option value="none">No rounding (69.6 stays a 2:1)</option>
            <option value="1dp">To 1 decimal place</option>
            <option value="whole">To a whole mark (69.5 becomes 70)</option>
          </select>
        </div>
        {s.weighting === "custom" && (
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div>
              <label className="label" htmlFor={`${id}-c2`}>2nd year weight</label>
              <input id={`${id}-c2`} className="field" inputMode="decimal" value={s.custom[0]} onChange={(e) => setS({ ...s, custom: [e.target.value, s.custom[1]] })} />
            </div>
            <div>
              <label className="label" htmlFor={`${id}-c3`}>Final year weight</label>
              <input id={`${id}-c3`} className="field" inputMode="decimal" value={s.custom[1]} onChange={(e) => setS({ ...s, custom: [s.custom[0], e.target.value] })} />
            </div>
          </div>
        )}
      </div>

      <YearTable title="Second year (Level 5)" rows={s.y2} idp={`${id}-y2`} onChange={(y2) => setS({ ...s, y2 })} />
      <YearTable title="Final year (Level 6)" rows={s.y3} idp={`${id}-y3`} onChange={(y3) => setS({ ...s, y3 })} />

      <section className="card border-[var(--accent)]" aria-live="polite" aria-labelledby={`${id}-res`}>
        <h2 id={`${id}-res`} className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">Your predicted degree</h2>
        {result ? (
          <>
            <p className="mt-2 text-4xl font-bold">{result.classification}</p>
            <p className="mt-1 text-slate-700">
              Overall average <strong>{fmt(result.overall)}%</strong>
              {s.rounding !== "none" && <> (rounded to {result.rounded}%)</>}. Second year {fmt(result.year2)}%, final year {fmt(result.year3)}%.
            </p>
            {result.borderlineFor && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                You are within 2 marks of a {result.borderlineFor}. Many universities look again at borderline marks, for example by counting
                how many of your final-year credits are in the higher class. Check your university&apos;s rules.
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-slate-700">
            {weightsOk ? "Add at least one module with credits and a mark for each year that has a weight." : "Weights must be zero or more and not both zero."}
          </p>
        )}
      </section>

      <section className="card space-y-3" aria-labelledby={`${id}-t`}>
        <h2 id={`${id}-t`} className="text-lg font-bold">What do I need in the rest of my final year?</h2>
        <div className="max-w-xs">
          <label className="label" htmlFor={`${id}-fc`}>Total final-year credits</label>
          <input id={`${id}-fc`} className="field" inputMode="numeric" value={s.finalCredits} onChange={(e) => setS({ ...s, finalCredits: e.target.value })} />
        </div>
        <p className="text-sm text-slate-600">
          Final-year credits still without a mark: {Math.max(0, finalCredits - totalCredits(y3)) || 0}. This assumes your second year is finished.
        </p>
        {targets.length === 0 && <p className="text-sm text-slate-700">Enter your second-year marks and the total credits first.</p>}
        <ul className="space-y-1" aria-live="polite">
          {targets.map(({ b, r }) => (
            <li key={b.short}>
              <strong>{b.short}:</strong>{" "}
              {r.status === "needed" && <>an average of {r.mark.toFixed(1)}% on the remaining credits</>}
              {r.status === "secured" && <>already reached on these weights, whatever you score</>}
              {r.status === "impossible" && <>out of reach (would need {r.mark.toFixed(1)}%)</>}
              {r.status === "no-credits-left" && <>no final-year credits left to change the result</>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

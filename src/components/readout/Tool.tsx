"use client";

import { useMemo, useState } from "react";
import { demos, type Demo } from "@/lib/demos";
import { buildReadout, emptyForm, parseSetup, rowsToCsv, type FormState } from "@/lib/readout";
import type { ResultRow } from "@/lib/stats";
import { btnGhost } from "./Field";
import Readout from "./Readout";
import ResultsStep from "./ResultsStep";
import SetupStep from "./SetupStep";

const steps = ["Setup", "Results", "Readout"];

function formFromDemo(d: Demo): FormState {
  return {
    name: d.title, hypothesis: d.hypothesis, metric: d.metric,
    shareA: String(d.plan.plannedShareA * 100), plannedN: String(d.plan.plannedPerVariant), confidence: String(d.plan.confidence * 100),
    baseline: String(d.plan.baseline * 100), minLift: String(d.plan.targetRelLift * 100), liftMode: "relative",
    monthlyUsers: String(d.plan.monthlyUsers), valuePerConversion: String(d.plan.valuePerConversion),
  };
}

export default function Tool() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ResultRow[] | null>(null);

  const result = useMemo(() => {
    if (step !== 2 || !rows) return null;
    const s = parseSetup(form);
    if (!s.ok) return null;
    try {
      return { setup: s.setup, readout: buildReadout(s.setup, rows) };
    } catch {
      return null;
    }
  }, [step, form, rows]);

  function loadDemo(d: Demo) {
    setForm(formFromDemo(d));
    setText(rowsToCsv(d.rows));
    setRows(d.rows);
    setStep(2);
    window.scrollTo({ top: 0 });
  }

  return (
    <div>
      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-medium">Try a demo (fills both steps)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {demos.map((d) => (
            <button key={d.name} type="button" onClick={() => loadDemo(d)} className="rounded-lg border border-zinc-200 p-3 text-left hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900">
              <span className="block font-medium">{d.label}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{d.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <ol className="my-8 flex list-none gap-2 p-0 text-sm" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} className={`flex-1 border-t-2 pt-2 ${i === step ? "border-foreground font-medium" : i < step ? "border-zinc-400 text-zinc-500" : "border-zinc-200 text-zinc-400 dark:border-zinc-800"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && <SetupStep form={form} setForm={setForm} onNext={() => setStep(1)} />}
      {step === 1 && <ResultsStep text={text} setText={setText} onBack={() => setStep(0)} onDone={(r) => { setRows(r); setStep(2); }} />}
      {step === 2 && (
        <div>
          {result ? (
            <Readout r={result.readout} setup={result.setup} />
          ) : (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              Could not build a readout from this setup and data. Go back and check both steps.
            </p>
          )}
          <div className="mt-8 flex gap-3">
            <button type="button" className={btnGhost} onClick={() => setStep(1)}>Edit results</button>
            <button type="button" className={btnGhost} onClick={() => setStep(0)}>Edit setup</button>
          </div>
        </div>
      )}
    </div>
  );
}

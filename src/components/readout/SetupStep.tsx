"use client";

import { useState } from "react";
import { sampleSizePerVariant } from "@/lib/stats";
import { parseSetup, type FormState } from "@/lib/readout";
import { Field, btnGhost, btnPrimary, inputCls } from "./Field";

export default function SetupStep({ form, setForm, onNext }: { form: FormState; setForm: (f: FormState) => void; onNext: () => void }) {
  const [error, setError] = useState("");
  const [calcNote, setCalcNote] = useState("");
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const b = Number(form.baseline), l = Number(form.minLift);
  const trim = (n: number) => String(Number(n.toFixed(2)));
  const liftExample =
    form.baseline && form.minLift && b > 0 && l > 0
      ? `Means ${trim(b)}% going to ${trim(form.liftMode === "relative" ? b * (1 + l / 100) : b + l)}%.`
      : form.liftMode === "relative" ? "Example: a 10% lift on a 10% baseline means 10% going to 11%." : "Example: a 10 point lift on a 10% baseline means 10% going to 20%.";

  function calculate() {
    setCalcNote("");
    const base = Number(form.baseline) / 100;
    const lift = Number(form.minLift) / 100;
    const conf = Number(form.confidence) / 100;
    if (!form.baseline || !form.minLift) return setCalcNote("Fill in the baseline rate and minimum lift below first.");
    try {
      const n = sampleSizePerVariant(base, lift, form.liftMode, conf);
      setForm({ ...form, plannedN: String(n) });
      setCalcNote(`${n.toLocaleString("en-US")} users per variant (80% power, ${form.confidence}% confidence).`);
    } catch (e) {
      setCalcNote(e instanceof Error ? e.message : "Could not calculate.");
    }
  }

  function next() {
    const r = parseSetup(form);
    if (!r.ok) return setError(r.error);
    setError("");
    onNext();
  }

  return (
    <div className="space-y-5">
      <p className="text-zinc-600 dark:text-zinc-400">Set the rules before you look at results. The plan is what stops you calling the test early.</p>
      <Field label="Experiment name">
        <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Simplified checkout button" />
      </Field>
      <Field label="Hypothesis">
        <textarea className={inputCls} rows={2} value={form.hypothesis} onChange={set("hypothesis")} placeholder="A single-step button will raise purchases." />
      </Field>
      <Field label="Primary metric">
        <input className={inputCls} value={form.metric} onChange={set("metric")} placeholder="Checkout conversion rate" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Planned split: % of users in control" hint={`Treatment gets the other ${100 - (Number(form.shareA) || 0)}%.`}>
          <input className={inputCls} inputMode="decimal" value={form.shareA} onChange={set("shareA")} />
        </Field>
        <Field label="Confidence level">
          <select className={inputCls} value={form.confidence} onChange={set("confidence")}>
            <option value="90">90%</option>
            <option value="95">95%</option>
            <option value="99">99%</option>
          </select>
        </Field>
      </div>

      <fieldset className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Planned sample size</legend>
        <Field label="Users per variant" hint="Type it, or calculate it from the two fields below.">
          <input className={inputCls} inputMode="numeric" value={form.plannedN} onChange={set("plannedN")} placeholder="12000" />
        </Field>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Baseline rate (%)" hint="Control conversion today.">
            <input className={inputCls} inputMode="decimal" value={form.baseline} onChange={set("baseline")} placeholder="10" />
          </Field>
          <Field label="Smallest lift you care about (%) *" hint="Needed for the underpowered check. Leave blank and that check is skipped.">
            <input className={inputCls} inputMode="decimal" value={form.minLift} onChange={set("minLift")} placeholder="10" />
          </Field>
          <Field label="That lift is" hint={liftExample}>
            <select className={inputCls} value={form.liftMode} onChange={set("liftMode")}>
              <option value="relative">Relative: % of the baseline</option>
              <option value="absolute">Absolute: percentage points</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <button type="button" className={btnGhost} onClick={calculate}>Calculate it for me</button>
          {calcNote && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{calcNote}</p>}
        </div>
        <p className="mt-3 text-xs text-zinc-500">* The smallest lift also drives &ldquo;Calculate it for me&rdquo; and the underpowered check on the readout.</p>
      </fieldset>

      <fieldset className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Business impact (optional)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monthly users">
            <input className={inputCls} inputMode="numeric" value={form.monthlyUsers} onChange={set("monthlyUsers")} placeholder="200000" />
          </Field>
          <Field label="Value per conversion (your currency)">
            <input className={inputCls} inputMode="decimal" value={form.valuePerConversion} onChange={set("valuePerConversion")} placeholder="500" />
          </Field>
        </div>
      </fieldset>

      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
      <button type="button" className={btnPrimary} onClick={next}>Next: add results</button>
    </div>
  );
}

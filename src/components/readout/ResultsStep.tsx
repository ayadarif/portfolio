"use client";

import { useRef, useState } from "react";
import { parseResults } from "@/lib/csv";
import type { ResultRow } from "@/lib/stats";
import { btnGhost, btnPrimary, inputCls } from "./Field";

export default function ResultsStep({
  text, setText, onBack, onDone,
}: { text: string; setText: (t: string) => void; onBack: () => void; onDone: (rows: ResultRow[]) => void }) {
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) return setError("That file is over 2 MB. Daily rows for two variants are far smaller; check it is the right file.");
    f.text().then((t) => { setText(t); setError(""); });
    e.target.value = "";
  }

  function go() {
    const r = parseResults(text);
    if (!r.ok) return setError(r.error);
    setError("");
    onDone(r.rows);
  }

  return (
    <div className="space-y-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        Paste or upload your results. Two variants only. Everything stays in your browser; nothing is sent anywhere.
      </p>
      <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <p className="font-medium">Accepted formats</p>
        <pre role="region" tabIndex={0} aria-label="CSV format example" className="mt-2 overflow-x-auto text-xs leading-5 text-zinc-600 dark:text-zinc-400">{`date,variant,users,conversions
2026-10-01,control,1000,100
2026-10-01,treatment,1010,113

or one row per variant (no chart):
variant,users,conversions
control,14000,1400
treatment,14100,1560`}</pre>
        <p className="mt-2 text-xs text-zinc-500">Header optional. Commas, tabs or semicolons. Control is the variant named control, A or baseline; otherwise the first one listed.</p>
      </div>
      <textarea
        className={`${inputCls} font-mono text-sm`}
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste CSV here"
        spellCheck={false}
        aria-label="Results CSV"
      />
      <div className="flex flex-wrap gap-3">
        <input ref={file} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={upload} className="hidden" />
        <button type="button" className={btnGhost} onClick={() => file.current?.click()}>Upload a CSV file</button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
      <div className="flex gap-3">
        <button type="button" className={btnGhost} onClick={onBack}>Back</button>
        <button type="button" className={btnPrimary} onClick={go}>Get the readout</button>
      </div>
    </div>
  );
}

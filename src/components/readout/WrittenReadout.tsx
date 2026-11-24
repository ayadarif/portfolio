"use client";

import { useEffect, useMemo, useState } from "react";
import { buildNarrative, rewritePayload } from "@/lib/narrative";
import type { Readout as R, Setup } from "@/lib/readout";

// Shows the rule-based readout. If the server has an API key it may return a validated rewrite, which replaces it.
// With no key (today) the server answers { enabled: false } and nothing changes on screen.
export default function WrittenReadout({ r, setup }: { r: R; setup: Setup }) {
  const sentences = useMemo(() => buildNarrative(setup, r), [setup, r]);
  const body = useMemo(() => JSON.stringify(rewritePayload(setup, r, sentences)), [setup, r, sentences]);
  const [ai, setAi] = useState<{ body: string; text: string } | null>(null);

  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/rewrite", { method: "POST", headers: { "content-type": "application/json" }, body, signal: ctl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (d?.ok && typeof d.text === "string") setAi({ body, text: d.text }); })
      .catch(() => {});
    return () => ctl.abort();
  }, [body]);

  const reworded = ai && ai.body === body ? ai.text : null;
  return (
    <section>
      <h3 className="text-lg font-semibold">In plain English</h3>
      <p className="mt-3 leading-7">{reworded ?? sentences.join(" ")}</p>
      {reworded && <p className="mt-2 text-xs text-zinc-500">Reworded by AI, then checked against the numbers above.</p>}
    </section>
  );
}

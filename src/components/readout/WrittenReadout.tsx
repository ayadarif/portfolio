"use client";

import { useEffect, useMemo, useState } from "react";
import { buildNarrative, rewritePayload } from "@/lib/narrative";
import type { Readout as R, Setup } from "@/lib/readout";
import { requestRewrite } from "@/lib/rewrite-client";

// Shows the rule-based readout. Only when the build flag NEXT_PUBLIC_REWRITE_ENABLED is "true" does it ask the server
// for a validated rewrite. With the flag unset (default) no request is made at all.
export default function WrittenReadout({ r, setup }: { r: R; setup: Setup }) {
  const sentences = useMemo(() => buildNarrative(setup, r), [setup, r]);
  const body = useMemo(() => JSON.stringify(rewritePayload(setup, r, sentences)), [setup, r, sentences]);
  const [ai, setAi] = useState<{ body: string; text: string } | null>(null);

  useEffect(() => {
    const ctl = new AbortController();
    requestRewrite(body, ctl.signal).then((text) => { if (text) setAi({ body, text }); });
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

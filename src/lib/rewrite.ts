// Server-side helper for the optional AI rewrite. Plain fetch to the Claude Messages API (no SDK dependency).
// Returns the rewritten text only if validateRewrite accepts it; anything else returns null so the page keeps the rule-based text.
import type { RewritePayload } from "./narrative";
import type { Verdict } from "./stats";
import { validateRewrite } from "./validate-rewrite";

export const MODEL = "claude-sonnet-5-5";
const VERDICTS: Verdict[] = ["Fix the data first", "Keep running", "Ship it", "Don't ship: it hurt", "No clear winner"];

// The request body comes from the browser, so check its shape before trusting it.
export function parsePayload(x: unknown): RewritePayload | null {
  if (typeof x !== "object" || x === null) return null;
  const p = x as Record<string, unknown>;
  if (!VERDICTS.includes(p.verdict as Verdict)) return null;
  if (typeof p.significant !== "boolean" || typeof p.trendingNegative !== "boolean") return null;
  if (typeof p.readout !== "string" || p.readout.length > 3000) return null;
  if (typeof p.numbers !== "object" || p.numbers === null) return null;
  const entries = Object.entries(p.numbers as Record<string, unknown>);
  if (entries.length > 40 || !entries.every(([, v]) => v === null || (typeof v === "number" && Number.isFinite(v)))) return null;
  return { verdict: p.verdict as Verdict, significant: p.significant, trendingNegative: p.trendingNegative, numbers: p.numbers as Record<string, number | null>, readout: p.readout };
}

const SYSTEM = `You rewrite a short A/B test readout so it reads naturally to a non-technical stakeholder.
Rules, all strict:
- Use only the facts and numbers in the JSON. Do not add, derive or estimate any number.
- Keep the same conclusion as the verdict. Do not soften or strengthen it.
- Use the word "significant" only if "significant" is true in the JSON; otherwise never use it.
- Keep every warning in the original readout (for example a trending-negative warning).
- 4 to 6 sentences, one plain paragraph. No lists, no markdown, no headings, no dashes used as punctuation.
- Reply with the rewritten text only.`;

type Fetch = typeof fetch;

export async function rewrite(p: RewritePayload, apiKey: string, fetchImpl: Fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 600, system: SYSTEM, messages: [{ role: "user", content: JSON.stringify(p) }] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
    return validateRewrite(text, p).ok ? text : null;
  } catch {
    return null;
  }
}

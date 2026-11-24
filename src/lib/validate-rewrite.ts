// Safety net for the optional AI rewrite. The rewrite is accepted only if every check passes;
// otherwise the page keeps the rule-based readout. Heuristics, not proof: they catch the obvious failures
// (wrong verdict, false significance, invented numbers), so the rule-based text stays the default.
import type { RewritePayload } from "./narrative";
import type { Verdict } from "./stats";

export type Validation = { ok: true } | { ok: false; reasons: string[] };

interface Num { mantissa: number; decimals: number; scale: number }

const SCALES: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, billion: 1e9 };

// Pulls every number out of a text: "1,200", "4.8%", "2.5k", "1.2 million". A minus sign is ignored (compared by size).
export function extractNumbers(text: string): Num[] {
  const out: Num[] = [];
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(thousand|million|billion|k|m|b)?(?![a-z])/gi)) {
    const raw = m[1].replace(/,/g, "");
    out.push({ mantissa: Number(raw), decimals: raw.includes(".") ? raw.split(".")[1].length : 0, scale: m[2] ? SCALES[m[2].toLowerCase()] : 1 });
  }
  return out;
}

// Everything the rewrite may quote: numbers in the payload values and in the rule-based text.
export function allowedNumbers(p: RewritePayload): number[] {
  const nums = Object.values(p.numbers).filter((x): x is number => x !== null).map(Math.abs);
  for (const n of extractNumbers(p.readout)) nums.push(n.mantissa * n.scale);
  return nums;
}

// A number is allowed if it equals an allowed value rounded to the digits the rewrite wrote ("about 4.8%" for 4.83).
function isAllowed(n: Num, allowed: number[]): boolean {
  return allowed.some((a) => Number((a / n.scale).toFixed(n.decimals)) === n.mantissa);
}

const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'");

const NEG_SHIP = /\b(?:do not|don't|should not|shouldn't|not|never|cannot|can't|hold off on|avoid)\s+(?:yet\s+)?(?:ship|shipping|roll(?:ing)? out|launch(?:ing)?)/;
const POS_SHIP = /\b(?:ship it|ship this|roll(?:ing)? (?:it )?out|launch it|safe to ship|ready to ship|recommend shipping|go ahead and ship)\b/;

interface Rule { forbidden: RegExp[]; required: RegExp[]; allowNegShip: boolean; allowPosShip: boolean }
const rules: Record<Verdict, Rule> = {
  "Ship it": { forbidden: [/keep (?:the test )?running/, /no clear winner/, /fix the data/, /split is broken/, /stop the test/], required: [], allowNegShip: false, allowPosShip: true },
  "Don't ship: it hurt": { forbidden: [/no clear winner/, /fix the data/, /keep (?:the test )?running/], required: [], allowNegShip: true, allowPosShip: false },
  "Early win (valid sequential call)": { forbidden: [/no clear winner/, /fix the data/, /test is (?:complete|finished|done)/], required: [/early/], allowNegShip: false, allowPosShip: true },
  "Stop: it's hurting": { forbidden: [/no clear winner/, /fix the data/, /test is (?:complete|finished|done)/], required: [/early|stop/], allowNegShip: true, allowPosShip: false },
  "Keep running": { forbidden: [/no clear winner/, /fix the data/, /test is (?:complete|finished|done)/], required: [/running|wait|full sample|planned/], allowNegShip: true, allowPosShip: false },
  "Fix the data first": { forbidden: [/keep (?:the test )?running/], required: [/split|assign|data/], allowNegShip: true, allowPosShip: false },
  "No clear winner": { forbidden: [/fix the data/, /keep (?:the test )?running/], required: [], allowNegShip: true, allowPosShip: false },
};

const OVERCLAIM = /\b(?:proves?|proven|guarantee[sd]?|definitely|certainly|for sure)\b/;

export function validateRewrite(output: string, p: RewritePayload): Validation {
  const reasons: string[] = [];
  const text = norm(output).trim();
  if (text.length < 40 || text.length > 1500) reasons.push("length out of range");

  // 1. Significance: the word may appear only if the stats support it.
  if (!p.significant && /significan/.test(text)) reasons.push("claims significance the stats do not support");
  if (OVERCLAIM.test(text)) reasons.push("overstates certainty");

  // 2. Verdict: no contradicting recommendations, and the key stance must survive.
  const rule = rules[p.verdict];
  const hasNegShip = NEG_SHIP.test(text);
  const withoutNeg = text.replace(new RegExp(NEG_SHIP.source, "g"), " ");
  if (hasNegShip && !rule.allowNegShip) reasons.push(`says do not ship, but the verdict is "${p.verdict}"`);
  if (POS_SHIP.test(withoutNeg) && !rule.allowPosShip) reasons.push(`recommends shipping, but the verdict is "${p.verdict}"`);
  for (const f of rule.forbidden) if (f.test(text)) reasons.push(`contradicts the verdict "${p.verdict}"`);
  for (const q of rule.required) if (!q.test(text)) reasons.push(`drops the point of the verdict "${p.verdict}"`);
  if (p.trendingNegative && !/negative|worse|lower|stop/.test(text)) reasons.push("drops the trending-negative warning");

  // 3. Numbers: nothing that is not in the input.
  const allowed = allowedNumbers(p);
  for (const n of extractNumbers(text)) {
    if (!isAllowed(n, allowed)) reasons.push(`number not in the input: ${n.mantissa}${n.scale > 1 ? " (scaled)" : ""}`);
  }

  return reasons.length ? { ok: false, reasons: [...new Set(reasons)] } : { ok: true };
}

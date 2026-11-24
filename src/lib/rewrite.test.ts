import { describe, expect, it } from "vitest";
import type { RewritePayload } from "./narrative";
import { parsePayload, rewrite } from "./rewrite";

const p: RewritePayload = {
  verdict: "No clear winner", significant: false, trendingNegative: false,
  numbers: { controlRatePct: 10, treatmentRatePct: 10.1, confidencePct: 95 },
  readout: "The new version converted at 10.10% against 10.00% for the original.",
};
const reply = (text: string, ok = true) => (async () => ({ ok, json: async () => ({ content: [{ type: "text", text }] }) })) as unknown as typeof fetch;

describe("rewrite()", () => {
  it("returns a valid rewrite", async () => {
    const t = "The new version converted at 10.1% against 10% for the original, and there is no clear difference at 95% confidence.";
    expect(await rewrite(p, "k", reply(t))).toBe(t);
  });
  it("falls back (null) on an invalid rewrite", async () => {
    expect(await rewrite(p, "k", reply("The new version converted at 10.1% against 10%, a significant win. Ship it now."))).toBeNull();
  });
  it("falls back on an API error or a thrown fetch", async () => {
    expect(await rewrite(p, "k", reply("anything long enough to pass the length rule, 10.1%", false))).toBeNull();
    expect(await rewrite(p, "k", (async () => { throw new Error("network"); }) as unknown as typeof fetch)).toBeNull();
  });
});

describe("parsePayload()", () => {
  it("accepts a well-formed payload", () => expect(parsePayload(p)).toEqual(p));
  it("rejects junk", () => {
    expect(parsePayload(null)).toBeNull();
    expect(parsePayload({ ...p, verdict: "Ship it!!" })).toBeNull();
    expect(parsePayload({ ...p, numbers: { a: "x" } })).toBeNull();
    expect(parsePayload({ ...p, readout: "x".repeat(5000) })).toBeNull();
  });
});

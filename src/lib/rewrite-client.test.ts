import { describe, expect, it, vi } from "vitest";
import { requestRewrite } from "./rewrite-client";

const sig = new AbortController().signal;

describe("requestRewrite()", () => {
  it("makes zero network requests when the flag is off", async () => {
    const f = vi.fn();
    expect(await requestRewrite("{}", sig, false, f as unknown as typeof fetch)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it("is off by default (flag unset in the test environment)", async () => {
    const f = vi.fn();
    expect(await requestRewrite("{}", sig, undefined, f as unknown as typeof fetch)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it("calls the route once when the flag is on, and returns the text", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: true, text: "hello" })));
    expect(await requestRewrite("{}", sig, true, f as unknown as typeof fetch)).toBe("hello");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("returns null on a failed request when on", async () => {
    const f = vi.fn(async () => { throw new Error("network"); });
    expect(await requestRewrite("{}", sig, true, f as unknown as typeof fetch)).toBeNull();
  });
});

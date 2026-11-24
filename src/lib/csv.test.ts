import { describe, expect, it } from "vitest";
import { parseResults } from "./csv";

const err = (s: string) => {
  const r = parseResults(s);
  if (r.ok) throw new Error("expected an error");
  return r.error;
};

describe("parseResults", () => {
  it("reads daily rows with a header", () => {
    const r = parseResults("date,variant,users,conversions\n2026-10-01,control,1000,100\n2026-10-01,treatment,1000,110");
    expect(r).toEqual({ ok: true, dated: true, rows: [
      { date: "2026-10-01", variant: "control", users: 1000, conversions: 100 },
      { date: "2026-10-01", variant: "treatment", users: 1000, conversions: 110 },
    ] });
  });
  it("reads one row per variant, no header, tab separated", () => {
    const r = parseResults("A\t5000\t500\nB\t5000\t540\n");
    expect(r.ok && r.dated).toBe(false);
    expect(r.ok && r.rows).toHaveLength(2);
  });
  it("accepts headers in another order", () => {
    const r = parseResults("variant,conversions,users\nA,50,500\nB,60,500");
    expect(r.ok && r.rows[0]).toEqual({ variant: "A", users: 500, conversions: 50 });
  });
  it("handles Windows line endings and blank lines", () => expect(parseResults("A,10,1\r\n\r\nB,10,2\r\n").ok).toBe(true));
  it("empty input", () => expect(err("  \n ")).toMatch(/Nothing to read/));
  it("wrong column count", () => expect(err("a,b\n1,2")).toMatch(/Line 1 has 2 columns/));
  it("ragged row", () => expect(err("A,10,1\nB,10")).toMatch(/Line 2 has 2 columns but the first line has 3/));
  it("missing header column", () => expect(err("variant,users,clicks\nA,10,1")).toMatch(/missing: conversions/));
  it("non-numeric users", () => expect(err("A,ten,1\nB,10,1")).toMatch(/Line 1: users must be a whole number/));
  it("decimal users", () => expect(err("A,1.5,1\nB,10,1")).toMatch(/whole number/));
  it("conversions above users names the line", () => expect(err("A,10,1\nB,10,11")).toMatch(/Line 2: conversions \(11\) cannot exceed users \(10\)/));
  it("zero users", () => expect(err("A,0,0\nB,10,1")).toMatch(/users is 0/));
  it("bad date", () => expect(err("2026-13-40,A,10,1\n2026-10-01,B,10,1")).toMatch(/not a date/));
  it("duplicate variant on a date", () => expect(err("2026-10-01,A,10,1\n2026-10-01,A,10,1\n2026-10-01,B,10,1")).toMatch(/twice on 2026-10-01/));
  it("duplicate variant without dates", () => expect(err("A,10,1\nA,10,1\nB,10,1")).toMatch(/twice/));
  it("three variants", () => expect(err("A,10,1\nB,10,1\nC,10,1")).toMatch(/Found 3 variants/));
  it("one variant", () => expect(err("A,10,1")).toMatch(/Found 1 variant /));
  it("header but no data", () => expect(err("variant,users,conversions")).toMatch(/no data rows/));
});

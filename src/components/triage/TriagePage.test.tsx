import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import data from "@/data/feedback-triage.json";
import { lookFirst, rankedRows, type TriageData } from "@/lib/triage";
import TriagePage from "./TriagePage";

const d = data as unknown as TriageData;
const html = renderToStaticMarkup(<TriagePage data={d} />);

describe("Feedback triage page (server render)", () => {
  it("scopes the headline to the sample and says the reviews are unverified", () => {
    expect(html).toContain(`Among ${d.method.n_classified.toLocaleString("en-US")} Google Play reviews`);
    expect(html).toContain("unverified");
  });
  it("shows no accuracy number until the eval exists", () => {
    expect(d.eval.status).toBe("Accuracy check in progress");
    expect(html).toContain("Accuracy check:");
    expect(html).toContain("Accuracy check in progress");
    expect(html).not.toMatch(/agreement|kappa/i);
  });
  it("credits the dataset, its licence and the authors", () => {
    expect(html).toContain("Apache-2.0");
    expect(html).toContain(d.method.dataset_url);
    expect(html).toContain("not by this project");
  });
  it("has a ranked table and a look-first card for every bank, and praise is never ranked", () => {
    for (const [bank, g] of Object.entries(d.ranking)) {
      expect(html).toContain(bank);
      expect(lookFirst(g)).toHaveLength(3);
      expect(rankedRows(g).some((c) => c.category === "praise" || c.category === "other")).toBe(false);
    }
  });
  it("ranks are consecutive and priority equals share x severity x 100", () => {
    for (const g of Object.values(d.ranking)) {
      rankedRows(g).forEach((c, i) => {
        expect(c.rank).toBe(i + 1);
        expect(c.priority).toBeCloseTo(c.share * c.avg_severity * 100, 6);
      });
    }
  });
  it("never shows a quote for security_fraud", () => {
    for (const byCat of Object.values(d.excerpts)) expect(Object.keys(byCat)).not.toContain("security_fraud");
  });
  it("makes no claim that the page itself calls a model", () => {
    expect(html).toContain("Nothing on this page calls a model");
    expect(html).not.toContain("<script");
  });
  it("has no em or en dashes", () => expect(html).not.toMatch(/[–—]/));
});

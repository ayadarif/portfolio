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
  it("accuracy numbers on the page are the ones in the data, and the labels line is present", () => {
    expect(d.eval.status).toBe("Done");
    if (d.eval.status !== "Done") return;
    expect(html).toContain(`${d.eval.run1.category_agree} of ${d.eval.run1.n}`);
    expect(html).toContain("Cohen&#x27;s kappa");
    expect(html).toContain("Keyword baseline");
    expect(html).toContain("Labels by Ayad; an AI assistant helped draft the notes, not the labels.");
    expect(d.eval.run1.category_agree_ci[0]).toBeLessThan(d.eval.run1.category_agree / d.eval.run1.n);
    expect(d.eval.run1.category_agree_ci[1]).toBeGreaterThan(d.eval.run1.category_agree / d.eval.run1.n);
  });
  it("model beats the keyword baseline in the data it shows, or the page would be misleading", () => {
    if (d.eval.status === "Done") expect(d.eval.run1.category_agree).toBeGreaterThan(d.eval.keyword_baseline.category_agree);
  });
  it("explains the choice of banks", () => expect(html).toContain("most reviews in the latest full year"));
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

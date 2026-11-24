// Turns pasted or uploaded CSV text into ResultRow[], with plain-English errors that name the line.
// Accepted: date,variant,users,conversions (daily rows) or variant,users,conversions (one row per variant).
// Header row optional (columns can then be in any order). Comma, tab or semicolon separated.
import type { ResultRow } from "./stats";

export type ParseResult = { ok: true; rows: ResultRow[]; dated: boolean } | { ok: false; error: string };

const fail = (error: string): ParseResult => ({ ok: false, error });

function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const isNumeric = (s: string) => /^-?\d+(\.\d+)?$/.test(s);

export function parseResults(text: string): ParseResult {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l, i) => ({ text: l.trim(), no: i + 1 }))
    .filter((l) => l.text !== "");
  if (lines.length === 0) return fail("Nothing to read. Paste your results or upload a CSV file.");

  const delim = lines[0].text.includes("\t") ? "\t" : lines[0].text.includes(";") ? ";" : ",";
  const cells = lines.map((l) => ({ no: l.no, cols: l.text.split(delim).map((c) => c.trim().replace(/^"|"$/g, "")) }));

  // A header is a first row where the users/conversions columns are not numbers.
  const width = cells[0].cols.length;
  if (width !== 3 && width !== 4) {
    return fail(`Line ${cells[0].no} has ${width} column${width === 1 ? "" : "s"}. Use date,variant,users,conversions (or variant,users,conversions with one row per variant).`);
  }
  const dated = width === 4;
  let order = dated ? ["date", "variant", "users", "conversions"] : ["variant", "users", "conversions"];
  const first = cells[0].cols;
  const hasHeader = !isNumeric(first[width - 1]) && !isNumeric(first[width - 2]);
  if (hasHeader) {
    const names = first.map((c) => c.toLowerCase());
    const missing = order.filter((n) => !names.includes(n));
    if (missing.length) return fail(`Header row is missing: ${missing.join(", ")}. Expected columns: ${order.join(", ")}.`);
    order = names;
    cells.shift();
  }
  if (cells.length === 0) return fail("Found a header but no data rows.");

  const col = (name: string) => order.indexOf(name);
  const rows: ResultRow[] = [];
  const seen = new Set<string>();
  for (const { no, cols } of cells) {
    if (cols.length !== width) return fail(`Line ${no} has ${cols.length} columns but the first line has ${width}.`);
    const variant = cols[col("variant")];
    if (!variant) return fail(`Line ${no}: the variant name is empty.`);
    const usersRaw = cols[col("users")];
    const convRaw = cols[col("conversions")];
    if (!/^\d+$/.test(usersRaw)) return fail(`Line ${no}: users must be a whole number, got "${usersRaw}". Remove thousands separators like "1,000".`);
    if (!/^\d+$/.test(convRaw)) return fail(`Line ${no}: conversions must be a whole number, got "${convRaw}".`);
    const users = Number(usersRaw);
    const conversions = Number(convRaw);
    if (users === 0) return fail(`Line ${no}: users is 0 for "${variant}".`);
    if (conversions > users) return fail(`Line ${no}: conversions (${conversions}) cannot exceed users (${users}).`);
    let date: string | undefined;
    if (dated) {
      date = cols[col("date")];
      if (!isRealDate(date)) return fail(`Line ${no}: "${date}" is not a date. Use YYYY-MM-DD, like 2026-10-01.`);
    }
    const key = `${date ?? ""}|${variant}`;
    if (seen.has(key)) return fail(dated ? `Line ${no}: "${variant}" appears twice on ${date}.` : `Line ${no}: "${variant}" appears twice. Give one row per variant, or add a date column for daily rows.`);
    seen.add(key);
    rows.push({ ...(date ? { date } : {}), variant, users, conversions });
  }

  const variants = [...new Set(rows.map((r) => r.variant))];
  if (variants.length !== 2) return fail(`Found ${variants.length} variant${variants.length === 1 ? "" : "s"} (${variants.join(", ")}). This tool compares exactly 2.`);
  return { ok: true, rows, dated };
}

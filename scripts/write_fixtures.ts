// Regenerates scripts/fixtures/datasets.json from src/lib/demos.ts (run with: node scripts/write_fixtures.ts).
import { writeFileSync } from "node:fs";
import { demos } from "../src/lib/demos.ts";

const out = demos.map((d) => ({ name: d.name, plan: d.plan, rows: d.rows }));
writeFileSync(new URL("./fixtures/datasets.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log("wrote", out.map((d) => `${d.name}: ${d.rows.length} rows`).join(", "));

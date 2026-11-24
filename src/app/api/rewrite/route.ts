// Optional AI rewrite of the written readout. OFF unless ANTHROPIC_API_KEY is set (then it answers { enabled: false }
// and the page shows nothing extra). Only computed numbers and the verdict arrive here; the key never leaves the server.
import { parsePayload, rewrite } from "@/lib/rewrite";

// Best-effort limits kept in memory. On serverless each instance has its own counters, so this slows abuse; it does not stop it.
const perIp = new Map<string, number[]>();
let global: number[] = [];
const recent = (list: number[], windowMs: number) => list.filter((t) => Date.now() - t < windowMs);

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ enabled: false });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const mine = recent(perIp.get(ip) ?? [], 60_000);
  global = recent(global, 3_600_000);
  if (mine.length >= 10 || global.length >= 200) return Response.json({ enabled: true, ok: false }, { status: 429 });
  perIp.set(ip, [...mine, Date.now()]);
  global.push(Date.now());

  const raw = await req.text();
  if (raw.length > 8000) return Response.json({ enabled: true, ok: false }, { status: 413 });
  let payload;
  try {
    payload = parsePayload(JSON.parse(raw));
  } catch {
    payload = null;
  }
  if (!payload) return Response.json({ enabled: true, ok: false }, { status: 400 });

  const text = await rewrite(payload, key);
  return Response.json(text ? { enabled: true, ok: true, text } : { enabled: true, ok: false });
}

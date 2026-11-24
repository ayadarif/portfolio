// Browser side of the optional AI rewrite. Sends nothing unless the build flag NEXT_PUBLIC_REWRITE_ENABLED is "true".
// Next.js swaps the flag in at build time, so it must be read as the literal process.env.NEXT_PUBLIC_REWRITE_ENABLED.
export const REWRITE_ENABLED = process.env.NEXT_PUBLIC_REWRITE_ENABLED === "true";

// Returns the reworded text, or null (no request at all when disabled; null on any failure, so the rule-based text stays).
export async function requestRewrite(
  body: string,
  signal: AbortSignal,
  enabled: boolean = REWRITE_ENABLED,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!enabled) return null;
  try {
    const res = await fetchImpl("/api/rewrite", { method: "POST", headers: { "content-type": "application/json" }, body, signal });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.ok && typeof d.text === "string" ? d.text : null;
  } catch {
    return null;
  }
}

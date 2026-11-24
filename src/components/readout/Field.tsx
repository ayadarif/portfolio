// Shared form pieces so every input looks the same.
import type { ReactNode } from "react";

export const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:focus:border-zinc-400";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export const btnPrimary =
  "rounded-lg bg-foreground px-4 py-2 font-medium text-background hover:opacity-90 disabled:opacity-40";
export const btnGhost =
  "rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

"use client";

// Three-way switch: Light, System, Dark. System follows the OS and updates live.
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme";

type Choice = "light" | "system" | "dark";
const options: Choice[] = ["light", "system", "dark"];

function apply(c: Choice) {
  const dark = c === "dark" || (c === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const listeners = new Set<() => void>();
const read = (): Choice => {
  let v: string | null = null;
  try { v = localStorage.getItem(THEME_KEY); } catch { /* storage blocked: follow the system */ }
  return v === "light" || v === "dark" ? v : "system";
};
function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onOs = () => apply(read());
  mq.addEventListener("change", onOs);
  return () => { listeners.delete(cb); mq.removeEventListener("change", onOs); };
}

export default function ThemeToggle() {
  // Server and first client render both say "system"; the real stored choice is read right after, with no flash because the inline script already set the class.
  const choice = useSyncExternalStore(subscribe, read, () => "system" as Choice);

  function pick(c: Choice) {
    try { localStorage.setItem(THEME_KEY, c); } catch { /* storage blocked: the choice lasts for this page only */ }
    apply(c);
    listeners.forEach((l) => l());
  }

  return (
    <div role="group" aria-label="Colour theme" className="inline-flex rounded-md border border-border-token font-mono text-xs">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={choice === o}
          onClick={() => pick(o)}
          className={`min-h-6 min-w-6 px-2.5 py-1 capitalize first:rounded-l-md last:rounded-r-md ${choice === o ? "bg-accent-soft text-foreground" : "text-muted"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

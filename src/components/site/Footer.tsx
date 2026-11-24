import KarachiTime from "./KarachiTime";
import { colophon } from "@/data/content";
import lh from "@/data/lighthouse.json";

const pages = Object.values(lh.pages);
const range = (k: "performance" | "accessibility" | "best-practices" | "seo") => {
  const v = pages.map((p) => p[k]);
  const lo = Math.min(...v), hi = Math.max(...v);
  return lo === hi ? `${lo}` : `${lo} to ${hi}`;
};

export default function Footer() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-3xl border-t border-border-token px-4 py-8 text-sm text-muted sm:px-6">
      <p>Karachi, <KarachiTime /></p>
      <h2 className="mt-6 font-mono text-xs uppercase tracking-wider">Colophon</h2>
      <ul className="mt-2 space-y-1 leading-6">
        {colophon.map((line) => <li key={line}>{line}</li>)}
        <li>
          Lighthouse, mobile emulation, median of 3 runs on {pages.length} pages ({lh.measured}, local build, same settings as CI): performance {range("performance")}, accessibility {range("accessibility")}, best practices {range("best-practices")}, SEO {range("seo")}. Layout shift 0. These are lab scores, not field data.
        </li>
      </ul>
    </footer>
  );
}

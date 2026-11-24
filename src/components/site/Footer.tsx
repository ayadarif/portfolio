import KarachiTime from "./KarachiTime";
import { colophon } from "@/data/content";

export default function Footer() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-3xl border-t border-border-token px-4 py-8 text-sm text-muted sm:px-6">
      <p>Karachi, <KarachiTime /></p>
      <h2 className="mt-6 font-mono text-xs uppercase tracking-wider">Colophon</h2>
      <ul className="mt-2 space-y-1 leading-6">
        {colophon.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </footer>
  );
}

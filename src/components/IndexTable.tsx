import Link from "next/link";
import { work } from "@/data/work";

// Typeset index of everything: name, type, status, year, one key metric. Scrolls inside its own region on narrow screens.
export default function IndexTable() {
  return (
    <section aria-labelledby="index-h" className="py-8">
      <h2 id="index-h" className="font-mono text-xs uppercase tracking-wider text-muted">Work</h2>
      <div role="region" aria-label="Work index, scrolls sideways on small screens" tabIndex={0} className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border-token font-mono text-xs uppercase tracking-wider text-muted">
              <th scope="col" className="py-2 pr-4 font-normal">Name</th>
              <th scope="col" className="py-2 pr-4 font-normal">Type</th>
              <th scope="col" className="py-2 pr-4 font-normal">Status</th>
              <th scope="col" className="py-2 pr-4 font-normal">Year</th>
              <th scope="col" className="py-2 font-normal">Key metric</th>
            </tr>
          </thead>
          <tbody>
            {work.map((w) => (
              <tr key={w.slug} className="border-b border-border-token align-top">
                <th scope="row" className="py-3 pr-4 font-medium"><Link href={`/#${w.slug}`} className="text-accent">{w.name}</Link></th>
                <td className="whitespace-nowrap py-3 pr-4 text-muted">{w.kind}</td>
                <td className="py-3 pr-4 text-muted">{w.status}</td>
                <td className="whitespace-nowrap py-3 pr-4 font-mono text-muted">{w.year}</td>
                <td className="py-3">{w.metric}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

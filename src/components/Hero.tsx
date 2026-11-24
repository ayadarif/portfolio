import { intro, contactLinks } from "@/data/content";

// The top half of the first screen carries the facts a skimmer looks for: who, what role, where from, how long, and proof.
export default function Hero() {
  const n = intro.now;
  return (
    <header className="pt-10 pb-8 sm:pt-14">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{intro.name}</h1>
      <p className="mt-3 max-w-xl text-lg leading-7 sm:text-xl sm:leading-8">{intro.roleLine}</p>
      <p className="mt-4 text-sm leading-6 text-muted">
        <span className="font-medium text-foreground">{n.title}, {n.company}</span> ({n.descriptor}), {n.dates}. {intro.years} {n.before}
      </p>
      <ul className="mt-6 grid gap-x-8 gap-y-3 border-y border-border-token py-4 sm:grid-cols-3" aria-label="Selected results">
        {intro.numbers.map((x) => (
          <li key={x.value}>
            <a href={x.href} className="block no-underline">
              <span className="block font-mono text-2xl font-medium text-accent">{x.value}</span>
              <span className="mt-1 block text-sm leading-5 text-muted">{x.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">{intro.location}</p>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {contactLinks.map((l) => (
          <li key={l.label}><a href={l.href} className="inline-block py-1 font-medium text-accent">{l.label}</a></li>
        ))}
      </ul>
    </header>
  );
}

import { intro } from "@/data/content";

export default function Hero() {
  return (
    <header className="py-16 sm:py-24">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
        {intro.name}
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        {intro.headline}
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {intro.summary}
      </p>
    </header>
  );
}

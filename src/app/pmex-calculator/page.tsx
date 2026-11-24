import type { Metadata } from "next";
import Link from "next/link";
import Calculator from "@/components/pmex/Calculator";

export const metadata: Metadata = {
  title: "PMEX contract calculator | Ayad Arif",
  description: "Margin, tick value in rupees, break-even after fees and taxes, and auto-liquidation distance for PMEX gold and crude contracts. A risk tool, not a signal.",
};

export default function PmexCalculatorPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/#projects" className="text-sm text-zinc-500 underline">Back to portfolio</Link>
      <h1 className="mt-4 text-3xl font-semibold">PMEX contract calculator</h1>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        What does one contract cost, what is a tick worth in rupees, where do I break even after fees and taxes, and how far can price move against me before the broker closes the position. It answers those before a trade. It does not predict prices or suggest trades. Runs in your browser; nothing is stored or sent.
      </p>
      <div className="mt-8"><Calculator /></div>
    </main>
  );
}

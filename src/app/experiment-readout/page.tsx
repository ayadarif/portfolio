import type { Metadata } from "next";
import Link from "next/link";
import Tool from "@/components/readout/Tool";

export const metadata: Metadata = {
  title: "Experiment Readout | Ayad Arif",
  description: "Upload A/B test results and get a verdict plus the checks teams skip: broken splits, early calls and underpowered tests.",
};

export default function ExperimentReadoutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/#projects" className="text-sm text-zinc-500 underline">Back to portfolio</Link>
      <h1 className="mt-4 text-3xl font-semibold">Experiment Readout</h1>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        A/B test results in, a verdict out, with the checks teams skip. Runs entirely in your browser.
      </p>
      <div className="mt-8">
        <Tool />
      </div>
    </main>
  );
}

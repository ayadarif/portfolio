import type { Metadata } from "next";
import Link from "next/link";
import TriagePage from "@/components/triage/TriagePage";
import data from "@/data/feedback-triage.json";
import type { TriageData } from "@/lib/triage";

export const metadata: Metadata = {
  title: "Feedback triage | Ayad Arif",
  description: "What customers raise most in Google Play reviews of three Nigerian banking apps, sorted and ranked by a fixed AI pipeline, with saved results and the method shown.",
};

export default function FeedbackTriagePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/#projects" className="text-sm text-zinc-500 underline">Back to portfolio</Link>
      <h1 className="mt-4 text-3xl font-semibold">What customers raise most about three Nigerian banking apps</h1>
      <TriagePage data={data as unknown as TriageData} />
    </main>
  );
}

import { caseStudies } from "@/data/content";
import CaseStudyCard from "./CaseStudyCard";

export default function CaseStudies() {
  return (
    <section id="case-studies" className="py-12">
      <h2 className="text-2xl font-semibold">Case studies</h2>
      <div className="mt-8 space-y-6">
        {caseStudies.map((study) => (
          <CaseStudyCard key={study.title} study={study} />
        ))}
      </div>
    </section>
  );
}

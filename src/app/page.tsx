import Hero from "@/components/Hero";
import CaseStudies from "@/components/CaseStudies";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <Hero />
      <CaseStudies />
      <Projects />
      <Contact />
    </main>
  );
}

import { contactLinks } from "@/data/content";

export default function Contact() {
  return (
    <section id="contact" className="py-12">
      <h2 className="text-2xl font-semibold">Contact</h2>
      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        {contactLinks.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="font-medium underline">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

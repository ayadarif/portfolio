// All site text lives here. Edit this file to write your real copy.
// Components in src/components only display what is defined below.

export type CaseStudy = {
  title: string;
  role: string;
  problem: string;
  whatIDid: string;
  results: string;
  learned: string;
};

export type Project = {
  name: string;
  description: string;
  status: string;
  href?: string; // add a link once the project is live
};

export type ContactLink = {
  label: string;
  href: string;
};

export const intro = {
  name: "Your Name",
  headline: "Product manager. One-line pitch goes here.",
  summary:
    "Two or three sentences about who you are, what you build, and what you want to do next. Placeholder text.",
};

export const caseStudies: CaseStudy[] = [
  {
    title: "Case study one title",
    role: "Your role, company, dates",
    problem: "Describe the problem in two sentences. Placeholder.",
    whatIDid: "Describe what you did and how. Placeholder.",
    results: "State what the numbers moved. Placeholder.",
    learned: "One honest lesson from this project. Placeholder.",
  },
  {
    title: "Case study two title",
    role: "Your role, company, dates",
    problem: "Describe the problem in two sentences. Placeholder.",
    whatIDid: "Describe what you did and how. Placeholder.",
    results: "State what the numbers moved. Placeholder.",
    learned: "One honest lesson from this project. Placeholder.",
  },
  {
    title: "Case study three title",
    role: "Your role, company, dates",
    problem: "Describe the problem in two sentences. Placeholder.",
    whatIDid: "Describe what you did and how. Placeholder.",
    results: "State what the numbers moved. Placeholder.",
    learned: "One honest lesson from this project. Placeholder.",
  },
];

export const projects: Project[] = [
  {
    name: "AI project one",
    description: "What it does and who it is for. Placeholder.",
    status: "Planned",
  },
  {
    name: "AI project two",
    description: "What it does and who it is for. Placeholder.",
    status: "Planned",
  },
];

export const contactLinks: ContactLink[] = [
  { label: "Email", href: "mailto:you@example.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/your-handle" },
  { label: "GitHub", href: "https://github.com/your-handle" },
];

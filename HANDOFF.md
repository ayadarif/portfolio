# Handoff

## Goal
Simple one-page portfolio for Ayad (PM). Sections: intro, 3 case studies, Projects (AI tools), contact. Free on Vercel from GitHub. Ayad wants to understand every file.

## Stack
Next.js 16.4.6, React 19.3, TypeScript, Tailwind 4.3, npm. App Router, src/ dir.
Note: AGENTS.md says this Next.js has breaking changes; read node_modules/next/dist/docs/ before non-trivial Next code.

## Decisions
See decisions.md. Ayad chose the stack; Claude chose the file layout (approved plan).

## Done
- Scaffolded with create-next-app (run by Ayad).
- Placeholder content in src/data/content.ts; Hero, CaseStudies, CaseStudyCard, Projects, Contact components; page.tsx; layout metadata.
- npm run build passes.

## Next
1. Ayad reviews the page locally (npm run dev, http://localhost:3000).
2. Commit; gh auth login; create GitHub repo and push (ask first).
3. Deploy on Vercel.
4. Ayad writes real copy in content.ts; swap placeholder name and links.
5. Add src/app/api/<tool>/route.ts for the AI tools.

## Open questions
- Real name/headline, site name, domain (skip paid domain for now).

## Preferences
Plain explanations, one concept at a time, short replies, no em dashes, ask before pushing.

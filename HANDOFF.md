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
- Public GitHub repo: https://github.com/ayadarif/portfolio (pushed 2026-11-24). Secrets audit clean: only .env.example tracked.
- Deployed on Vercel (Hobby): https://aaportfolio-delta.vercel.app . Live, returns 200, shows placeholder content. Auto-redeploys on push to main.

- Real copy in content.ts (intro, 3 case studies, 3 projects, contact). Results is now a list (string[]); CaseStudyCard renders bullets. Tab title: Ayad Arif | Product Manager.
- Experiment Readout stats module (2026-11-24): src/lib/stats.ts, 36 vitest tests (npm test), scripts/check_stats.py (scipy check, uses scripts/.venv). Run: python3 -m venv scripts/.venv && scripts/.venv/bin/pip install scipy && scripts/.venv/bin/python scripts/check_stats.py

## Next
0. Experiment Readout UI at /experiment-readout (spec: docs/experiment-readout-spec.md). Stats module is done; build UI on top of it.
1. Proofread copy on the live site; check phone view.
2. Add src/app/api/<tool>/route.ts for the AI tools.

## Open questions
- Real name/headline, site name, domain (skip paid domain for now).

## Preferences
Plain explanations, one concept at a time, short replies, no em dashes, ask before pushing.

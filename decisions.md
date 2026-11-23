# Decisions

- Next.js + TypeScript + Tailwind. One stack for the static page now and server-side Claude API calls in the next two projects.
- All site text in src/data/content.ts. Edit copy without touching layout code.
- No component library, CMS or animation library. Smallest thing that ships.
- Components are server components with no client JavaScript. Page is fully static, so it is fast and free to host.
- Public GitHub repo; secrets only in .env.local and Vercel env vars. .env.example is committed, real .env files are not.
- Deleted the default Next.js logo SVGs from public/. They were unused.

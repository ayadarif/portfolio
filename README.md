This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Experiment Readout (`/experiment-readout`)

A/B test results in, a verdict out, plus the checks teams skip. Everything except the optional AI rewrite runs in the browser. Spec: `docs/experiment-readout-spec.md`.

- `npm test` runs all unit tests. `npm run build` builds the site.
- Stats live in `src/lib/stats.ts`. The written readout is `src/lib/narrative.ts` (rules and templates, no AI).

### Optional AI rewrite (OFF by default)

The written readout is rule-based. An optional layer can reword it more naturally using the Claude API. It stays off until you set a key.

1. Put `ANTHROPIC_API_KEY=your-key` in `.env.local` (local) or in the Vercel project settings (live). Never commit it.
2. With no key, `POST /api/rewrite` answers `{"enabled": false}` and the page shows nothing extra.
3. With a key, the page asks the route for a rewrite after each readout. Only the verdict, the computed numbers and the rule-based text are sent. The experiment name, hypothesis and metric text are not.
4. Every rewrite is checked in `src/lib/validate-rewrite.ts` before it is shown. It is rejected, and the rule-based text stays, if it:
   - recommends something that contradicts the verdict (for example "ship it" under "Don't ship"), or drops the point of "Keep running" / "Fix the data first";
   - uses the word "significant" when p is not below alpha or the CI includes zero (even "not significant", to match the strict rule);
   - contains a number that is not in the input (rounding of an input number is fine);
   - overstates certainty ("proves", "guaranteed"), or drops the trending-negative warning.
5. The validator is a heuristic safety net. It will not catch every subtle misstatement, which is why the rule-based text is the default.

Before you turn it on in production: the route is a public URL and each call costs money. It has a size cap and a simple in-memory rate limit (10 per minute per IP, 200 per hour overall), but that is per server instance and is best effort. Set a spend limit on the API key in the Anthropic console first.

Tests: `src/lib/validate-rewrite.test.ts` (good and bad example outputs), `src/lib/rewrite.test.ts` (fallback behaviour with a fake `fetch`), `src/lib/narrative.test.ts`.

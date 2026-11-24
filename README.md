# Portfolio

Hi, I'm Ayad Arif, a product manager who started out as a data analyst. This site has three case studies from my product work and the AI tools I'm building on the side.

Live site: https://aaportfolio-delta.vercel.app

## Projects

- **Experiment Readout** (live, at `/experiment-readout`): paste or upload A/B test results and get one verdict, plus the checks teams skip: uneven splits, early peeking and underpowered tests. Details below.
- **Feedback triage** (in progress): JazzCash vs Easypaisa. An AI pipeline, run offline with Claude Code, sorts public app reviews into ranked themes. Not in this repo yet.
- **Five-Minute Brief** (prototype): paste an email thread before a client meeting and get what you owe, what they owe and what to raise. Not in this repo yet.

The site is Next.js 16, React 19, TypeScript and Tailwind, hosted free on Vercel. All site text lives in `src/data/content.ts`.

## Run it

```bash
npm install
npm run dev     # site at http://localhost:3000
npm test        # all unit tests
npm run build   # production build
```

Optional cross-check of the stats module against scipy (uses a local Python venv):

```bash
python3 -m venv scripts/.venv && scripts/.venv/bin/pip install scipy && scripts/.venv/bin/python scripts/check_stats.py
```

## Experiment Readout (`/experiment-readout`)

A/B test results in, a verdict out, plus the checks teams skip. Everything except the optional AI rewrite runs in the browser. Spec: `docs/experiment-readout-spec.md`.

- `npm test` runs all unit tests. `npm run build` builds the site.
- Stats live in `src/lib/stats.ts`. The written readout is `src/lib/narrative.ts` (rules and templates, no AI).

### Optional AI rewrite (OFF by default)

The written readout is rule-based. An optional layer can reword it more naturally using the Claude API. It stays off until you set a key. Tested with a fake fetch; never run against the live API.

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

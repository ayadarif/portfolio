// All site text lives here. Edit this file to write your real copy.
// Components in src/components only display what is defined below.

export type CaseStudy = {
  slug: string;
  headline: string; // one line, contains a number
  tldr: [string, string, string];
  year: string;
  metric: string; // short, for the index table
  title: string;
  role: string;
  problem: string;
  whatIDid: string;
  results: string[]; // one bullet per entry
  learned: string;
  learnedLink?: { text: string; href: string }; // optional closing sentence with a link, shown after `learned`
};

export type Project = {
  slug: string;
  headline: string;
  tldr: [string, string, string];
  type: string; // Tool, AI pipeline, Prototype
  year: string;
  metric: string;
  name: string;
  description: string;
  status: string;
  href?: string; // add a link once the project is live
};

export type ContactLink = {
  label: string;
  href: string;
};

export const SITE_URL = "https://aaportfolio-delta.vercel.app";
export const PROVENANCE = "Designed, specified and verified by Ayad; built with Claude Code.";

export const intro = {
  name: "Ayad Arif",
  headline: "Product manager with an analyst's toolkit.",
  roleLine: "Product manager who builds: growth, experimentation and AI tools, with an analyst's toolkit.",
  now: {
    title: "Product Manager, Growth and Strategy",
    company: "SastaTicket",
    descriptor: "online travel booking platform in Pakistan",
    dates: "Apr 2024 to Jul 2026",
    before: "Before that: Daraz (Alibaba Group), an e-commerce marketplace, on promotions and discounting.",
  },
  years: "Nearly six years in product and data roles.",
  numbers: [
    { value: "+18%", label: "3-month retention from a loyalty program (SastaTicket, relative)", href: "/#loyalty-program" },
    { value: "0.84 vs 0.41", label: "Kappa against my labels: triage pipeline against a keyword baseline", href: "/#feedback-triage" },
    { value: "26% to 1%", label: "False winners under daily peeking, ordinary against sequential (simulation)", href: "/#experiment-readout" },
  ],
  location: "Karachi, PKT (UTC+5). Works across GMT and CET hours.",
  summary:
    "I've spent nearly six years in product and data roles at SastaTicket and Daraz (Alibaba Group), working on growth, retention, pricing and experimentation. I started as an analyst, so I find and size problems myself in SQL and Python before deciding what to build. Lately I've been building product tools with Claude Code.",
};

export const colophon = [
  "Set in IBM Plex Sans and IBM Plex Mono.",
  "The accent is ajrak indigo, the deep blue of Sindhi block-printed cloth. Neutrals are tinted toward it.",
  "Next.js and Tailwind, hosted on Vercel. No tracking, no custom cursor, no intro animation.",
  PROVENANCE,
];

export const caseStudies: CaseStudy[] = [
  {
    slug: "loyalty-program",
    headline: '3-month retention up 18% from a loyalty program Finance first turned down.',
    tldr: ['Guest users had no stable ID, so bookings could not be attributed and A/B tests were unreliable.', 'Finance rejected my first proposal, so I ran a pilot: cashback for half of a B2B cohort, nothing for the other half.', 'The rewarded group came back sooner and more often, which won the budget. Paid CAC fell 12%.'],
    year: "2024 to 2026",
    metric: 'Retention +18% (3 months, relative)',
    title: "Loyalty program: turning guest traffic into retained accounts",
    role: "Product Manager, Growth and Strategy | SastaTicket | Apr 2024 to Jul 2026",
    problem:
      "Most of SastaTicket's traffic came from guest users. With no stable ID, we couldn't attribute bookings or run clean A/B tests, and a large part of our base was invisible to us. The root cause wasn't tracking. People simply had no reason to create an account and stay signed in.",
    whatIDid:
      "Finance rejected my first proposal; to them, a loyalty program looked like giving margin away. So I stopped arguing and ran a pilot. I picked B2B users for it because they book often enough to show a result in weeks, not months. I split a cohort of medium-frequency accounts in two and gave one half cashback while the other got nothing. The rewarded group came back sooner and more often, and that result won the budget. V1 was deliberately small: 1.5% back on the amount paid for flights, capped at PKR 500 per redemption, with no tiers and no other product lines. Once it worked, I added reward tiers, earn and burn rules per product, a payment-method integration that cut merchant fees, and automated push and email triggers.",
    results: [
      "3-month retention up 18%",
      "Registered users up 22%",
      "Paid CAC down 12% (3 months before vs after launch)",
      "Became the top driver of guest-to-account conversion",
      "Automated triggers reached 25,000 users a month at 4 to 6% re-engagement and cut manual segmentation work by 80%",
    ],
    learned:
      "I underestimated abuse. Points were credited at booking with no lock-up, so some users booked, cancelled and kept the points. We changed the rule so points unlock only after the flight is taken. I now plan for abuse cases before launch, not after.",
  },
  {
    slug: "experimentation",
    headline: 'Cut the GA4 reporting gap from 15 to 18% to under 6%, then ran 10 to 15 experiments across 4 teams in 6 months.',
    tldr: ['Product decisions went to the strongest hunch, and GA4 disagreed with internal numbers by 15 to 18%.', 'I traced the gap to four causes and unified GA4 with internal data, then brought in GrowthBook for four teams.', 'Teams still stopped tests early and picked metrics after the fact, so I now build those checks in from day one.'],
    year: "2024 to 2026",
    metric: 'Reporting gap 15 to 18% down to under 6%',
    title: "Experimentation: from the loudest voice to evidence",
    role: "Product Manager, Growth and Strategy | SastaTicket | Apr 2024 to Jul 2026",
    problem:
      "Product decisions went to whoever had the strongest hunch or the most sway in the room. Even when someone wanted evidence, the data couldn't settle anything: GA4 and our internal numbers disagreed by 15 to 18%.",
    whatIDid:
      "Two things had to be fixed together: the data and the habit. On data, I traced the gap to four causes. Booking events fired twice or not at all. Users lost attribution when they came back from payment gateways. The free GA4 tier had its own limits. And GA4 and our internal systems didn't count a \"booking\" the same way. I unified GA4 with our internal data so the commercial team had one number to trust. On habit, I brought in GrowthBook and standardised how four product teams ran A/B tests.",
    results: [
      "Reporting discrepancy cut from 15 to 18% to under 6%",
      "10 to 15 experiments across 4 teams in 6 months",
      "Removed a decision from search results: choosing a fare type and extras moved from the flight card to the add-ons screen later in checkout. Booking funnel progression rose 2.5%. Nobody, me included, expected a change that small to move anything, which is exactly why it was worth testing.",
    ],
    learned:
      "Adopting a tool is the easy part; discipline is the hard part. Teams still made the classic mistakes: stopping tests the moment results looked good, accepting uneven splits between variants without asking why, and picking the success metric after seeing the results. If I did it again, I'd build those checks into the process from day one instead of catching them in review.",
    learnedLink: { text: "Experiment Readout", href: "/experiment-readout" },
  },
  {
    slug: "free-cancellation",
    headline: 'Three insurance-style products, priced from airline penalty schedules, lifted profitability by 5%.',
    tldr: ['Customers kept complaining about airline cancellation charges, and absorbing the cost would never have been funded.', 'I treated it as underwriting: a premium paid at booking, priced flight by flight from the penalty schedule, time to departure and route cancellation rate.', 'Extended into Free Date Changes and Delay Protection, still running when I left in 2026.'],
    year: "2022 to 2026",
    metric: 'Profitability +5% across three products',
    title: "Free cancellation: flexibility priced like insurance",
    role: "Senior Data Analyst, then Product Manager | SastaTicket | 2022 to 2026",
    problem:
      "Customers kept complaining about airline cancellation charges and asking whether we could do anything about them. Absorbing the cost ourselves was never going to get funded.",
    whatIDid:
      "I treated it as an underwriting problem. The customer pays a premium at booking and can later cancel or amend their ticket at no extra cost. A flat fee would have overcharged safe flights and underpriced risky ones, so the premium was priced flight by flight from three inputs: that flight's airline penalty schedule, the time left before departure, and the observed cancellation rate on that route. In effect, an insurance product built inside a travel platform by an analyst, not an underwriter. After I returned as a product manager in 2024, I scaled it to all flights on all routes.",
    results: [
      "Extended the same pricing model into Free Date Changes and Delay Protection",
      "Together, the three products lifted profitability by 5%",
      "Still running when I left in 2026, nearly four years after the first version",
      "Became a reason customers chose SastaTicket: customers told me so directly, and many 5-star reviews named Free Cancellation as the feature that set us apart",
    ],
    learned:
      "The pricing model mattered less than the reframe. Everyone saw cancellation fees as a cost to absorb or ignore. Treating them as a risk you could price turned a complaint into a feature people chose us for.",
  },
];

export const projects: Project[] = [
  {
    slug: "experiment-readout",
    headline: 'In 4,000 simulated A/B tests with no real difference, daily peeking called a winner in 26%; the sequential range, in 1%.',
    tldr: ['Paste daily results; get checks for uneven splits, early peeking and underpowered tests, then one verdict.', 'Below the planned sample, only a sequential range that stays valid under daily checking can make an early call.', 'It will not call a result significant unless the p-value and the confidence range both support it.'],
    type: "Tool",
    year: "2026",
    metric: '26% to 1% false winners (simulated)',
    name: "Experiment Readout",
    description:
      "Review an A/B test the way a careful analyst would: checks for uneven splits, early peeking and underpowered tests, then gives one clear verdict. Won't call a result significant unless the p-value and the confidence range both support it.",
    status: "Live",
    href: "/experiment-readout",
  },
  {
    slug: "feedback-triage",
    headline: 'Matches my labels with kappa 0.84 against 0.41 for a keyword baseline, on 100 held-out reviews.',
    tldr: ['Sorts 900 public Google Play reviews of three Nigerian banking apps into categories and severities, then ranks them with plain code.', 'Every quote is checked word for word against the source review.', 'Tested five times against my own labels, with a prompt-injection set and a batch-size test.'],
    type: "AI pipeline",
    year: "2026",
    metric: 'Kappa 0.84 vs 0.41 baseline',
    name: "Feedback triage pipeline",
    description:
      "A fixed pipeline, run with Claude Code, that sorts 900 public Google Play reviews of three Nigerian banking apps into categories and severities, then ranks them with plain code. Quotes are checked word for word against the source. On 100 held-out reviews, its first category matched mine 87 times (kappa 0.84), against 50 for a keyword baseline. The tool also runs on any feedback CSV.",
    status: "Live",
    href: "/feedback-triage",
  },
  {
    slug: "five-minute-brief",
    headline: 'Turns an email thread into what you owe, what they owe and what to raise, each tied to the line it came from.',
    tldr: ['Paste an email thread before a client meeting.', 'Get three lists, each item pointing to its source line.', 'The demo uses a made-up thread; generating your own may need a Claude account.'],
    type: "Prototype",
    year: "2026",
    metric: 'Each item cites its source line',
    name: "Five-Minute Brief",
    description:
      "Paste an email thread before a client meeting and get what you owe, what they owe and what to raise, each tied to the line it came from. The demo uses a made-up thread; generating your own brief may need a Claude account.",
    status: "Prototype (runs on claude.ai)",
    href: "https://claude.ai/artifact/MhbGR8RkAYidk3WVEiR7YQ",
  },
  {
    slug: "pmex-calculator",
    headline: 'Shows how far price can move against a PMEX position before the broker closes it, solved exactly, with no price predictions.',
    tldr: ['Margin, tick value in rupees, break-even after fees and taxes, for gold, crude and Brent contracts.', 'Liquidation distance is recomputed at the new price, as brokers do, not the 0.9% rule of thumb.', 'A risk tool: it never predicts prices or suggests trades.'],
    type: "Tool",
    year: "2026",
    metric: 'Exact liquidation distance',
    name: "PMEX contract calculator",
    description:
      "Margin, tick value in rupees, break-even after fees and taxes, and how far price can move against you before the broker closes the position, for PMEX gold, crude and Brent contracts. A risk tool: it never predicts prices or suggests trades.",
    status: "Live",
    href: "/pmex-calculator",
  },
];

export const contactLinks: ContactLink[] = [
  { label: "Email", href: "mailto:ayad_arif@hotmail.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ayad-arif" },
  { label: "GitHub", href: "https://github.com/ayadarif" },
];

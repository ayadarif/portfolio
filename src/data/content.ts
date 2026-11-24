// All site text lives here. Edit this file to write your real copy.
// Components in src/components only display what is defined below.

export type CaseStudy = {
  title: string;
  role: string;
  problem: string;
  whatIDid: string;
  results: string[]; // one bullet per entry
  learned: string;
  learnedLink?: { text: string; href: string }; // optional closing sentence with a link, shown after `learned`
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
  name: "Ayad Arif",
  headline: "Product manager with an analyst's toolkit.",
  summary:
    "I've spent nearly six years in product and data roles at SastaTicket and Daraz (Alibaba Group), working on growth, retention, pricing and experimentation. I started as an analyst, so I find and size problems myself in SQL and Python before deciding what to build. Right now I'm building AI tools for product teams with Claude Code.",
};

export const caseStudies: CaseStudy[] = [
  {
    title: "Loyalty program: turning guest traffic into retained accounts",
    role: "Product Manager, Growth and Strategy | SastaTicket | Apr 2024 to Jul 2026",
    problem:
      "Most of SastaTicket's traffic came from guest users. With no stable ID, we couldn't attribute bookings or run clean A/B tests, and a large part of our base was invisible to us. The root cause wasn't tracking. People simply had no reason to create an account and stay signed in.",
    whatIDid:
      "Finance rejected my first proposal; to them, a loyalty program looked like giving margin away. So I stopped arguing and ran a pilot. I picked B2B users for it because they book often enough to show a result in weeks, not months. I split a cohort of medium-frequency accounts in two and gave one half cashback while the other got nothing. The rewarded group came back sooner and more often, and that result won the budget. V1 was deliberately small: 1.5% back on the amount paid for flights, capped at PKR 500 per redemption, with no tiers and no other product lines. Once it worked, I added reward tiers, earn and burn rules per product, a payment-method integration that cut merchant fees, and automated push and email triggers.",
    results: [
      "3-month retention up 18%",
      "Registered users up 22%",
      "CAC down 12%",
      "Became the top driver of guest-to-account conversion",
      "Automated triggers reached 25,000 users a month at 4 to 6% re-engagement and cut manual segmentation work by 80%",
    ],
    learned:
      "I underestimated abuse. Points were credited at booking with no lock-up, so some users booked, cancelled and kept the points. We changed the rule so points unlock only after the flight is taken. I now plan for abuse cases before launch, not after.",
  },
  {
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
    title: "Free cancellation: flexibility priced like insurance",
    role: "Senior Data Analyst | SastaTicket | Sep 2020 to Oct 2022",
    problem:
      "Customers kept complaining about airline cancellation charges and asking whether we could do anything about them. Absorbing the cost ourselves was never going to get funded.",
    whatIDid:
      "I treated it as an underwriting problem. The customer pays a premium at booking and can later cancel or amend their ticket at no extra cost. A flat fee would have overcharged safe flights and underpriced risky ones, so the premium was priced flight by flight from three inputs: that flight's airline penalty schedule, the time left before departure, and the observed cancellation rate on that route. In effect, an insurance product built inside a travel platform by an analyst, not an underwriter.",
    results: [
      "Extended the same pricing model into Free Date Changes and Delay Protection",
      "Together, the three products lifted profitability by 5%",
      "Still running when I left in 2026, about four years after launch",
      "Became a reason customers chose SastaTicket: customers told me so directly, and many 5-star reviews named Free Cancellation as the feature that set us apart",
    ],
    learned:
      "The pricing model mattered less than the reframe. Everyone saw cancellation fees as a cost to absorb or ignore. Treating them as a risk you could price turned a complaint into a feature people chose us for.",
  },
];

export const projects: Project[] = [
  {
    name: "Experiment Readout",
    description:
      "Review an A/B test the way a careful analyst would: checks for uneven splits, early peeking and underpowered tests, then gives one clear verdict. Won't call a result significant unless the p-value and the confidence range both support it.",
    status: "Live",
    href: "/experiment-readout",
  },
  {
    name: "Feedback triage",
    description:
      "JazzCash vs Easypaisa. An AI pipeline, run offline with Claude Code, sorts hundreds of public app reviews (many in Roman Urdu) into ranked themes, with its accuracy measured against my own labels.",
    status: "In progress",
  },
  {
    name: "Five-Minute Brief",
    description:
      "Paste an email thread before a client meeting and get what you owe, what they owe and what to raise, each tied to the line it came from.",
    status: "Prototype",
  },
];

export const contactLinks: ContactLink[] = [
  { label: "Email", href: "mailto:ayad_arif@hotmail.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ayad-arif" },
  { label: "GitHub", href: "https://github.com/ayadarif" },
];

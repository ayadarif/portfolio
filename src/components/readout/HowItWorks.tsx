// Plain-language explanation of the checks. Static text, no state.
const items: [string, string][] = [
  ["Sample ratio check", "You planned a 50/50 split, so you should get close to 50/50. If a test with thousands of users lands at 53/47, something is off: a bug, bots, or the new version failing to load for some people. The check turns red when a split this lopsided would happen by chance less than 1 time in 1,000. When it fails, every other number is suspect, so the verdict becomes \"Fix the data first\"."],
  ["Called too early", "Early results swing wildly, and if you check every day you will eventually see a \"win\" that is just luck. The plan you set up front says how many users each version needs. Until both reach it, the verdict is \"Keep running\", even if the numbers look great or terrible."],
  ["Underpowered", "A small test can only spot big changes. If your sample could only detect a 2 point lift but you cared about 0.5, then \"no difference\" really means \"could not tell\". This check needs the \"smallest lift you care about\" field from the setup; leave it blank and the check is skipped."],
  ["Confidence range and p-value", "The range around the lift is where the true lift probably sits. If the whole range is above zero, the change probably helped; if it spans zero, the data cannot tell a real effect from chance. The p-value is the chance of seeing a gap this big if nothing had changed. The tool only says a result is statistically significant when the p-value is below your cutoff and the range excludes zero."],
  ["Business impact", "Takes your monthly users and the value of one conversion and applies the lift range to them. It gives a low, likely and high figure instead of one confident number, because one number would hide the uncertainty."],
  ["What it does not check", "Novelty effects that fade, results split by segment, or several metrics tested at once. A clean pass here is a good sign, not a guarantee."],
];

export default function HowItWorks() {
  return (
    <section className="mt-16 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <h2 className="text-xl font-semibold">How this works</h2>
      <dl className="mt-4 space-y-5">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt className="font-medium">{k}</dt>
            <dd className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

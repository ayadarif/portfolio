// Types and helpers for the Feedback triage page. The numbers come from src/data/feedback-triage.json,
// which is the triage.json the Python pipeline wrote (scripts/triage). Nothing here calls a model.

export interface CategoryRow {
  category: string;
  count: number;
  share: number; // fraction of the group's reviews
  avg_rating: number | null;
  avg_severity: number;
  severity3_count: number;
  priority: number; // severity points per 100 reviews
  ranked: boolean;
  rank?: number;
}

export interface GroupResult {
  n_reviews: number;
  categories: CategoryRow[];
  robustness: {
    top3_priority: string[];
    top3_count: string[];
    top3_severity3: string[];
    same_set_by_count: boolean;
    same_set_by_severity3: boolean;
    holds: boolean;
  };
}

export interface Theme { name: string; description: string; size: number; by_group: Record<string, number> }
export interface Quote { id: string; quote: string }

export interface TriageData {
  method: {
    dataset: string;
    dataset_url: string;
    dataset_licence: string;
    dataset_downloaded: string;
    dataset_note: string;
    sample: string;
    year: string;
    run_date: string;
    n_reviews_in: number;
    n_classified: number;
    n_unclassified: number;
    model: string;
    claude_code_version: string;
    prompt_hash: string;
    priority_definition: string;
  };
  ranking: Record<string, GroupResult>;
  themes: Record<string, Theme[]>;
  excerpts: Record<string, Record<string, Quote[]>>;
  eval: { status: string } & Record<string, unknown>;
}

export const CATEGORY_LABELS: Record<string, string> = {
  login_access: "Login and access",
  transfers_payments: "Transfers and payments",
  money_balance: "Money and balance",
  app_stability: "App stability",
  fees_charges: "Fees and charges",
  ui_ux: "Design and usability",
  feature_request: "Feature requests",
  support: "Customer support",
  security_fraud: "Security and fraud",
  praise: "Praise",
  other: "Other",
};

export const categoryLabel = (slug: string) => CATEGORY_LABELS[slug] ?? slug.replace(/_/g, " ");

export const rankedRows = (g: GroupResult) => g.categories.filter((c) => c.ranked).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

// "Where I'd look first": the top three ranked categories of a group, each with the numbers behind it.
export function lookFirst(g: GroupResult): CategoryRow[] {
  return rankedRows(g).slice(0, 3);
}

export const sharePct = (x: number) => `${(x * 100).toFixed(1)}%`;

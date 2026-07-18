import {
  SUGGESTION_POOL,
  type SuggestionItem,
  type Tradition,
  type BudgetTier,
  type GuestTier,
  type DayTier,
} from "../data/suggestion-pool";

export interface PlanAnswers {
  tradition: Tradition;
  budgetTier: BudgetTier;
  guestTier: GuestTier;
  dayTier: DayTier;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function matches<T extends string>(tag: T[] | "all", value: T): boolean {
  return tag === "all" || tag.includes(value);
}

function hashAnswers(answers: PlanAnswers, nonce: number): number {
  const str = `${answers.tradition}|${answers.budgetTier}|${answers.guestTier}|${answers.dayTier}|${nonce}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function generateSuggestions(
  answers: PlanAnswers,
  opts: {
    perCategory?: number;
    nonce?: number;
    categories?: string[];
    includeCommonlyMissed?: boolean;
    excludePoolItemIds?: string[];
  } = {},
): { byCategory: Record<string, SuggestionItem[]>; commonlyMissed: SuggestionItem[] } {
  const perCategory = opts.perCategory ?? 4;
  const nonce = opts.nonce ?? 0;
  const rng = mulberry32(hashAnswers(answers, nonce));
  const excluded = new Set(opts.excludePoolItemIds ?? []);

  const relevant = SUGGESTION_POOL.filter(
    (item) =>
      !excluded.has(item.id) &&
      matches(item.tradition, answers.tradition) &&
      matches(item.budgetTier, answers.budgetTier) &&
      matches(item.guestTier, answers.guestTier) &&
      matches(item.dayTier, answers.dayTier) &&
      (!opts.categories?.length || opts.categories.includes(item.category)),
  );

  const byCategory: Record<string, SuggestionItem[]> = {};
  for (const item of relevant) {
    if (item.commonlyMissed) continue;
    (byCategory[item.category] ??= []).push(item);
  }
  for (const category of Object.keys(byCategory)) {
    byCategory[category] = seededShuffle(byCategory[category], rng).slice(0, perCategory);
  }

  const commonlyMissed =
    opts.includeCommonlyMissed === false
      ? []
      : seededShuffle(
          relevant.filter((i) => i.commonlyMissed),
          rng,
        ).slice(0, opts.categories?.length ? 3 : 10);

  return { byCategory, commonlyMissed };
}

export type GeneratedSuggestions = ReturnType<typeof generateSuggestions>;

const MANUAL_COMMONLY_MISSED_ANSWERS: PlanAnswers = {
  tradition: "Custom",
  budgetTier: "mid",
  guestTier: "medium",
  dayTier: "3-4",
};

export function getCommonlyMissedPoolItems(answers: PlanAnswers | null): SuggestionItem[] {
  if (!answers) {
    return SUGGESTION_POOL.filter((item) => item.commonlyMissed && item.tradition === "all");
  }
  return SUGGESTION_POOL.filter(
    (item) =>
      item.commonlyMissed &&
      matches(item.tradition, answers.tradition) &&
      matches(item.budgetTier, answers.budgetTier) &&
      matches(item.guestTier, answers.guestTier) &&
      matches(item.dayTier, answers.dayTier),
  );
}

export function pickMoreCommonlyMissed(
  answers: PlanAnswers | null,
  excludeTaskTexts: string[],
  nonce: number,
  count = 3,
): SuggestionItem[] {
  const exclude = new Set(excludeTaskTexts);
  const pool = getCommonlyMissedPoolItems(answers).filter((item) => !exclude.has(item.task));
  const rng = mulberry32(
    answers
      ? hashAnswers(answers, nonce)
      : hashAnswers(MANUAL_COMMONLY_MISSED_ANSWERS, nonce + 9999),
  );
  return seededShuffle(pool, rng).slice(0, count);
}

export const DEFAULT_PLAN_ANSWERS: PlanAnswers = {
  tradition: "North Indian Hindu",
  budgetTier: "mid",
  guestTier: "medium",
  dayTier: "3-4",
};

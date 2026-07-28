import type { SuggestionItem } from "../data/suggestion-pool";
import type { PlanAnswers } from "./suggestion-engine";
import {
  generateSuggestions,
  getCommonlyMissedPoolItems,
} from "./suggestion-engine";
import { commonlyMissedItemsToPlanningInputs } from "./commonly-missed-tasks";
import { suggestedDateFromLeadTime } from "./lead-time-dates";
import { seedDefaultBudgetCategories } from "./wallet-api";
import {
  createWedding,
  insertPlanningTasks,
  type CreateWeddingInput,
  type Wedding,
} from "./wedding-api";

export type OnboardingBasics = CreateWeddingInput;

export type ReviewSuggestion = {
  poolItemId: string;
  task: string;
  category: string;
  leadTime: string;
  commonlyMissed: boolean;
  suggestedDate: string;
};

/**
 * Manual path: create wedding, seed budget categories + commonly-missed checklist tasks.
 */
export async function completeManualOnboarding(
  ownerId: string,
  basics: OnboardingBasics,
): Promise<Wedding> {
  const wedding = await createWedding(ownerId, basics);
  await seedDefaultBudgetCategories(wedding.id);

  const missed = getCommonlyMissedPoolItems(null).slice(0, 12);
  if (missed.length) {
    await insertPlanningTasks(
      wedding.id,
      commonlyMissedItemsToPlanningInputs(missed, wedding.date),
    );
  }

  return wedding;
}

/** Build the in-memory review list (nothing written to DB yet). */
export function buildOnboardingReviewSuggestions(
  answers: PlanAnswers,
  weddingDate: string,
): ReviewSuggestion[] {
  const generated = generateSuggestions(answers, {
    perCategory: 3,
    includeCommonlyMissed: true,
    nonce: 0,
  });

  const byId = new Map<string, ReviewSuggestion>();

  const add = (item: SuggestionItem, commonlyMissed: boolean) => {
    if (byId.has(item.id)) return;
    byId.set(item.id, {
      poolItemId: item.id,
      task: item.task,
      category: item.category,
      leadTime: item.leadTime,
      commonlyMissed,
      suggestedDate: suggestedDateFromLeadTime(weddingDate, item.leadTime),
    });
  };

  for (const list of Object.values(generated.byCategory)) {
    for (const item of list) add(item, false);
  }
  for (const item of generated.commonlyMissed) add(item, true);

  return Array.from(byId.values());
}

/**
 * AI-assisted finish: create wedding, seed categories, insert only accepted tasks.
 */
export async function completeAssistedOnboarding(
  ownerId: string,
  basics: OnboardingBasics,
  accepted: ReviewSuggestion[],
): Promise<Wedding> {
  const wedding = await createWedding(ownerId, basics);
  await seedDefaultBudgetCategories(wedding.id);

  if (accepted.length) {
    await insertPlanningTasks(
      wedding.id,
      accepted.map((item) => ({
        task: item.task,
        leadTime: item.leadTime,
        category: item.category,
        commonlyMissed: item.commonlyMissed,
        done: false,
        suggestedDate: item.suggestedDate,
      })),
    );
  }

  return wedding;
}

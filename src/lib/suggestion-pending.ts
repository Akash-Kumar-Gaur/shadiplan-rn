import type { GeneratedSuggestions } from "./suggestion-engine";
import { suggestedDateFromLeadTime } from "./lead-time-dates";

export type PendingSuggestionInput = {
  poolItemId: string;
  task: string;
  category: string;
  leadTime: string;
  commonlyMissed: boolean;
  suggestedDate: string;
  batchNonce: number;
};

export function suggestionsToPendingInputs(
  result: GeneratedSuggestions,
  weddingDate: string,
  batchNonce: number,
): PendingSuggestionInput[] {
  const items: PendingSuggestionInput[] = [];
  const seen = new Set<string>();

  for (const list of Object.values(result.byCategory)) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push({
        poolItemId: item.id,
        task: item.task,
        category: item.category,
        leadTime: item.leadTime,
        commonlyMissed: false,
        suggestedDate: suggestedDateFromLeadTime(weddingDate, item.leadTime),
        batchNonce,
      });
    }
  }

  return items;
}

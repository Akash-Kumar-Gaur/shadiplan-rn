import type { SuggestionItem } from "../data/suggestion-pool";
import type { PlanningTask } from "./wedding-api";
import { suggestedDateFromLeadTime } from "./lead-time-dates";

export function commonlyMissedItemsToPlanningInputs(
  items: SuggestionItem[],
  weddingDate: string,
): Array<Omit<PlanningTask, "id">> {
  return items.map((item) => ({
    task: item.task,
    leadTime: item.leadTime,
    category: item.category,
    commonlyMissed: true,
    done: false,
    suggestedDate: suggestedDateFromLeadTime(weddingDate, item.leadTime),
  }));
}

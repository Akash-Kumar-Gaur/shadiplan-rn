export const PLANNING_TASK_CATEGORIES = [
  "Venue",
  "Catering",
  "Photography",
  "Decor",
  "Attire",
  "Transport",
  "Music",
  "Legal",
  "Beauty",
  "Gifts",
  "Invitations",
  "Jewelry",
  "Emergency",
  "Accommodation",
  "Entertainment",
  "Other",
] as const;

export type PlanningTaskCategory = (typeof PLANNING_TASK_CATEGORIES)[number];

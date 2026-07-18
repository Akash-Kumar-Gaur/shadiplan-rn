export type Tradition =
  | "North Indian Hindu"
  | "South Indian"
  | "Punjabi"
  | "Bengali"
  | "Destination"
  | "Custom";

export type BudgetTier = "modest" | "mid" | "premium";
export type GuestTier = "intimate" | "medium" | "large"; // <100, 100-300, 300+
export type DayTier = "1-2" | "3-4" | "5+";
export type LeadTime = "12mo" | "9mo" | "6mo" | "3mo" | "1mo" | "1wk";

export interface SuggestionItem {
  id: string;
  category:
    | "Venue"
    | "Catering"
    | "Photography"
    | "Decor"
    | "Attire"
    | "Music"
    | "Transport"
    | "Legal"
    | "Beauty"
    | "Gifts"
    | "Invitations"
    | "Jewelry"
    | "Emergency"
    | "Accommodation"
    | "Entertainment";
  task: string;
  leadTime: LeadTime;
  tradition: Tradition[] | "all";
  budgetTier: BudgetTier[] | "all";
  guestTier: GuestTier[] | "all";
  dayTier: DayTier[] | "all";
  commonlyMissed: boolean;
}

export const SUGGESTION_POOL: SuggestionItem[] = [
  // --- Venue ---
  { id: "v1", category: "Venue", task: "Shortlist and visit 3-5 venues in person before booking", leadTime: "12mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "v2", category: "Venue", task: "Confirm backup indoor space for outdoor ceremonies (rain/heat plan)", leadTime: "6mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "v3", category: "Venue", task: "Check noise curfew and sound permit rules for late-night sangeet/reception", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "v4", category: "Venue", task: "Confirm parking and valet capacity for expected guest count", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: ["medium", "large"], dayTier: "all", commonlyMissed: true },
  { id: "v5", category: "Venue", task: "Book separate mandap/ceremony space distinct from reception hall", leadTime: "9mo", tradition: ["North Indian Hindu", "South Indian", "Punjabi", "Bengali"], budgetTier: "all", guestTier: "all", dayTier: ["3-4", "5+"], commonlyMissed: false },
  { id: "v6", category: "Venue", task: "Confirm venue power backup for generator/inverter during outages", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "v7", category: "Venue", task: "Get venue layout/floor plan for vendor load-in and stage placement", leadTime: "1mo", tradition: "all", budgetTier: ["mid", "premium"], guestTier: "all", dayTier: "all", commonlyMissed: true },

  // --- Catering ---
  { id: "c1", category: "Catering", task: "Lock final headcount with caterer (affects per-plate pricing)", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "c2", category: "Catering", task: "Confirm Jain / vegan / allergy-specific meal counts separately", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "c3", category: "Catering", task: "Schedule a tasting session before signing the final menu", leadTime: "6mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "c4", category: "Catering", task: "Arrange separate live counters (chaat, dessert) for sangeet night", leadTime: "3mo", tradition: "all", budgetTier: ["mid", "premium"], guestTier: "all", dayTier: ["3-4", "5+"], commonlyMissed: false },
  { id: "c5", category: "Catering", task: "Plan late-night snack station for post-reception guests", leadTime: "1mo", tradition: "all", budgetTier: ["premium"], guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "c6", category: "Catering", task: "Confirm water/beverage stations placed near dance floor and outdoor areas", leadTime: "1wk", tradition: "all", budgetTier: "all", guestTier: ["medium", "large"], dayTier: "all", commonlyMissed: true },

  // --- Photography ---
  { id: "p1", category: "Photography", task: "Book photographer + videographer team together for continuity", leadTime: "9mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "p2", category: "Photography", task: "Schedule a pre-wedding shoot 2-3 months before the wedding", leadTime: "3mo", tradition: "all", budgetTier: ["mid", "premium"], guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "p3", category: "Photography", task: "Share a shot-list of must-have family group photos in advance", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "p4", category: "Photography", task: "Confirm drone shoot permissions if venue allows aerial photography", leadTime: "1mo", tradition: "all", budgetTier: ["mid", "premium"], guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "p5", category: "Photography", task: "Assign a family member to coordinate photographer during ceremony rituals", leadTime: "1wk", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },

  // --- Decor ---
  { id: "d1", category: "Decor", task: "Finalize color palette and share across decor, attire, and invitations", leadTime: "6mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "d2", category: "Decor", task: "Confirm flower sourcing lead time, especially for out-of-season blooms", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "d3", category: "Decor", task: "Plan separate decor themes per day/ceremony (haldi yellow, sangeet vibrant, wedding traditional)", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: ["3-4", "5+"], commonlyMissed: false },
  { id: "d4", category: "Decor", task: "Arrange photo-booth or selfie corner with props for guests", leadTime: "1mo", tradition: "all", budgetTier: ["mid", "premium"], guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "d5", category: "Decor", task: "Confirm entrance/welcome decor separate from main venue decor budget", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },

  // --- Attire ---
  { id: "a1", category: "Attire", task: "Order bridal and groom outfits with buffer time for alterations", leadTime: "6mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "a2", category: "Attire", task: "Schedule final fitting at least 2 weeks before the wedding", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "a3", category: "Attire", task: "Plan separate outfits per ceremony day and confirm with families to avoid color clashes", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: ["3-4", "5+"], commonlyMissed: true },
  { id: "a4", category: "Attire", task: "Break in wedding footwear before the big day", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "a5", category: "Attire", task: "Pack an emergency stitching kit for outfit repairs on the day", leadTime: "1wk", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },

  // --- Music / Entertainment ---
  { id: "m1", category: "Music", task: "Book baraat band/dhol group and confirm route timing with venue security", leadTime: "3mo", tradition: ["North Indian Hindu", "Punjabi"], budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "m2", category: "Music", task: "Share a do-not-play list with the DJ alongside the must-play list", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "e1", category: "Entertainment", task: "Plan sangeet performance schedule and rehearsal slots with participating families", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: ["3-4", "5+"], commonlyMissed: false },
  { id: "e2", category: "Entertainment", task: "Arrange kids' activity corner if a large number of children are attending", leadTime: "1mo", tradition: "all", budgetTier: ["mid", "premium"], guestTier: ["medium", "large"], dayTier: "all", commonlyMissed: true },

  // --- Transport ---
  { id: "t1", category: "Transport", task: "Arrange baraat vehicle (horse/car/decorated vehicle) with backup option", leadTime: "3mo", tradition: ["North Indian Hindu", "Punjabi", "Bengali"], budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "t2", category: "Transport", task: "Schedule shuttle service between hotel blocks and venue for outstation guests", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: ["medium", "large"], dayTier: "all", commonlyMissed: true },
  { id: "t3", category: "Transport", task: "Arrange airport/station pickup for elderly or key family guests", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },

  // --- Legal ---
  { id: "l1", category: "Legal", task: "Complete marriage registration paperwork (varies by state/religion)", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "l2", category: "Legal", task: "Confirm required documents for name change post-wedding, if applicable", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "l3", category: "Legal", task: "Check visa/travel document validity for destination wedding guests", leadTime: "6mo", tradition: ["Destination"], budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },

  // --- Beauty ---
  { id: "b1", category: "Beauty", task: "Book hair and makeup artist with a trial run 2-3 months ahead", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "b2", category: "Beauty", task: "Plan mehendi artist booking with a design reference shared in advance", leadTime: "1mo", tradition: ["North Indian Hindu", "South Indian", "Punjabi", "Bengali"], budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "b3", category: "Beauty", task: "Start skincare routine at least 2 months out, not the week before", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },

  // --- Gifts ---
  { id: "g1", category: "Gifts", task: "Source and pack return gifts / welcome hampers ahead of guest arrival", leadTime: "1mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "g2", category: "Gifts", task: "Prepare welcome kits for outstation guests (snacks, water, itinerary card)", leadTime: "1mo", tradition: "all", budgetTier: ["mid", "premium"], guestTier: ["medium", "large"], dayTier: "all", commonlyMissed: true },

  // --- Invitations ---
  { id: "i1", category: "Invitations", task: "Finalize guest list before ordering invitations to avoid reprints", leadTime: "6mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: false },
  { id: "i2", category: "Invitations", task: "Send digital save-the-date before physical invites for outstation guests", leadTime: "6mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "i3", category: "Invitations", task: "Include dress code and day-wise schedule card with invitations", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: ["3-4", "5+"], commonlyMissed: true },

  // --- Jewelry ---
  { id: "j1", category: "Jewelry", task: "Get bridal jewelry insured before the wedding week", leadTime: "1mo", tradition: "all", budgetTier: ["mid", "premium"], guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "j2", category: "Jewelry", task: "Arrange secure storage/transport plan for jewelry between ceremony venues", leadTime: "1wk", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: ["3-4", "5+"], commonlyMissed: true },

  // --- Emergency ---
  { id: "em1", category: "Emergency", task: "Pack a day-of emergency kit (safety pins, stain remover, spare dupatta, painkillers)", leadTime: "1wk", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "em2", category: "Emergency", task: "Identify nearest hospital/pharmacy to each venue and share with coordinators", leadTime: "1wk", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
  { id: "em3", category: "Emergency", task: "Assign a point-of-contact per venue for vendor coordination on the day", leadTime: "1wk", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },

  // --- Accommodation ---
  { id: "ac1", category: "Accommodation", task: "Block hotel rooms for outstation guests before local rates rise", leadTime: "6mo", tradition: "all", budgetTier: "all", guestTier: ["medium", "large"], dayTier: "all", commonlyMissed: true },
  { id: "ac2", category: "Accommodation", task: "Confirm accessible/ground-floor rooms for elderly guests", leadTime: "3mo", tradition: "all", budgetTier: "all", guestTier: "all", dayTier: "all", commonlyMissed: true },
];

export type VendorCategory =
  | "Venue"
  | "Catering"
  | "Photography"
  | "Decor"
  | "Music"
  | "Transport"
  | "Attire"
  | "Other";

export type VendorStatus = "Confirmed" | "Pending" | "Paid";

export type VendorCandidateStatus = "considering" | "promoted" | "rejected";

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  contactName: string;
  phone: string;
  totalCost: number;
  advancePaid: number;
  dueDate: string;
  status: VendorStatus;
  notes?: string;
  payments: { id: string; amount: number; date: string; note?: string }[];
}

export interface VendorCandidateFile {
  id: string;
  vendorCandidateId: string;
  storagePath: string;
  fileName?: string;
  uploadedAt: string;
}

export interface VendorCandidate {
  id: string;
  weddingId: string;
  name: string;
  category: VendorCategory;
  contactName?: string;
  phone?: string;
  proposedAmount?: number;
  notes?: string;
  status: VendorCandidateStatus;
  createdAt: string;
  files: VendorCandidateFile[];
}

export type CreateVendorCandidateInput = {
  name: string;
  category: VendorCategory;
  contactName?: string;
  phone?: string;
  proposedAmount?: number;
  notes?: string;
};

export type RsvpStatus = "Confirmed" | "Pending" | "Declined";
export type MealPref = "Veg" | "Non-veg" | "Jain";

export interface GuestGroup {
  id: string;
  name: string;
  side: "Bride" | "Groom";
}

export interface Guest {
  id: string;
  name: string;
  groupId: string;
  phone?: string;
  email?: string;
  rsvp: RsvpStatus;
  meal: MealPref;
  accommodation: boolean;
  transportNeeded: boolean;
  accompanyingCount: number;
  notes?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  planned: number;
  actual: number;
}

export type Transaction = {
  id: string;
  vendorId?: string;
  vendorName: string;
  categoryId: string;
  amount: number;
  date: string;
  note?: string;
  taggedFor?: string[];
};

export type CreateExpenseInput = {
  amount: number;
  categoryId: string;
  vendorName?: string;
  date: string;
  note?: string;
  taggedFor?: string[];
};

export type CreateBudgetCategoryInput = {
  name: string;
  planned?: number;
};

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export const EXPENSE_TAG_PRESETS = [
  "Bride",
  "Groom",
  "Father of the Bride",
  "Mother of the Bride",
  "Father of the Groom",
  "Mother of the Groom",
] as const;

export type CreateVendorInput = {
  name: string;
  category: VendorCategory;
  contactName: string;
  phone: string;
  totalCost: number;
  advancePaid: number;
  dueDate: string;
  status: VendorStatus;
  notes?: string;
};

export type UpdateVendorInput = {
  name: string;
  category: VendorCategory;
  contactName: string;
  phone: string;
  totalCost: number;
  advancePaid: number;
  dueDate: string;
  status: VendorStatus;
  notes?: string;
};

export type CreateGuestGroupInput = {
  name: string;
  side: "Bride" | "Groom";
};

export type CreateGuestInput = {
  name: string;
  groupId: string;
  phone?: string;
  email?: string;
  meal: MealPref;
  accommodation: boolean;
  transportNeeded: boolean;
  accompanyingCount: number;
  notes?: string;
};

export type UpdateGuestInput = {
  name?: string;
  groupId?: string;
  rsvp?: RsvpStatus;
  phone?: string;
  meal?: MealPref;
  accommodation?: boolean;
  transportNeeded?: boolean;
  accompanyingCount?: number;
  notes?: string;
};

export const VENDOR_CATEGORIES: VendorCategory[] = [
  "Venue",
  "Catering",
  "Photography",
  "Decor",
  "Music",
  "Transport",
  "Attire",
  "Other",
];

export const NEW_GROUP_VALUE = "__new__";
export const NEW_CATEGORY_VALUE = "__new_category__";

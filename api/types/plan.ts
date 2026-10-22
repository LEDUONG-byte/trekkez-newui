export interface ItemCategory {
  id: string;
  name: string;
  items: string[];
}

export type PlanRequiredItem = {
  id: string;
  categoryId: string;
  label: string;
  custom: boolean;
};

export type PlanMode = "personal" | "team";

export type PlanItemStatus = {
  planId: string;
  itemId: string;
  userId: string;
  checked: boolean;
  updatedAt?: string;
};

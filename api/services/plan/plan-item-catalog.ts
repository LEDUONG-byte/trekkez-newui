import { getAuthSession } from "../auth/auth-session";
import { getAllSupabaseRows } from "../core/supabase-client";

import type { ItemCategory } from "../../types/plan";

type RemoteCategoryRow = {
  id: string;
  name: string;
  items: unknown;
  sort_order?: number | null;
  active?: boolean | null;
};

export const FALLBACK_ITEM_CATEGORIES: ItemCategory[] = [
  {
    id: "cat_clothing",
    name: "CLOTHING",
    items: [
      "Fleece jacket",
      "Base layer",
      "Hard shell",
      "Trekking pants",
      "Hat",
      "Buff",
      "Liner gloves",
      "Waterproof gloves",
    ],
  },
  {
    id: "cat_footwear",
    name: "FOOTWEAR",
    items: ["Trekking boots", "Camp shoes", "Gaiters", "Hiking socks"],
  },
  {
    id: "cat_backpacks",
    name: "BACKPACKS",
    items: ["Dry bag", "Rain cover", "Trekking backpack", "Waist pouch"],
  },
  {
    id: "cat_nutrition",
    name: "NUTRITION & HYDRATION",
    items: [
      "Water filter",
      "Trail food",
      "Water bottle",
      "Hydration bladder",
      "Electrolytes",
      "Energy bar",
    ],
  },
  {
    id: "cat_safety",
    name: "NAVIGATION & SAFETY",
    items: [
      "Headlamp",
      "First aid kit",
      "Whistle",
      "Map",
      "Compass",
      "Emergency blanket",
      "Power bank",
    ],
  },
  {
    id: "cat_shelter",
    name: "SHELTER & SLEEP",
    items: ["Tent", "Sleeping bag", "Sleeping pad", "Ground sheet"],
  },
  {
    id: "cat_personal",
    name: "PERSONAL & OTHER",
    items: ["Sunscreen", "Insect repellent", "Towel", "Personal medicine"],
  },
];

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCategory(row: RemoteCategoryRow): ItemCategory | null {
  if (!row || typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }

  const items = parseStringArray(row.items);

  return {
    id: row.id,
    name: row.name,
    items,
  };
}

export async function getPlanItemCategories(): Promise<ItemCategory[]> {
  const auth = await getAuthSession();

  if (!auth?.accessToken || !auth.userId) {
    return FALLBACK_ITEM_CATEGORIES;
  }

  try {
    const rows = await getAllSupabaseRows<RemoteCategoryRow>(
      "/rest/v1/plan_item_categories?select=id,name,items,sort_order,active&active=eq.true&order=sort_order.asc,name.asc",
      {
        accessToken: auth.accessToken,
        expectedUserId: auth.userId,
      },
    );

    const parsed = rows
      .map(parseCategory)
      .filter((item): item is ItemCategory => Boolean(item));

    return parsed.length > 0 ? parsed : FALLBACK_ITEM_CATEGORIES;
  } catch (error) {
    console.log("PLAN CATALOG: fallback", {
      error: error instanceof Error ? error.message : String(error),
    });

    return FALLBACK_ITEM_CATEGORIES;
  }
}

export function getCategoryName(
  categories: ItemCategory[],
  categoryId: string,
): string {
  return (
    categories.find((category) => category.id === categoryId)?.name ||
    "OTHER"
  );
}

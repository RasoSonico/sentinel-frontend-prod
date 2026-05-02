/**
 * Utility functions for converting Advances API responses to Realm-compatible data structures
 */

import { PhysicalAdvanceResponse } from "src/types/entities";

/**
 * Default values for PhysicalAdvance fields
 */
export const DEFAULT_ADVANCE = {
  id: 0,
  concept: 0,
  volume: "0",
  date: new Date().toISOString(),
  status: "PENDING" as const,
  comments: null,
} as const;

/**
 * Parse single Advance item for Realm
 */
export const parseAdvanceForRealm = (
  item: PhysicalAdvanceResponse,
): PhysicalAdvanceResponse => {
  try {
    return {
      id: Number(item.id) || 0,
      concept: Number(item.concept) || DEFAULT_ADVANCE.concept,
      volume: String(item.volume || DEFAULT_ADVANCE.volume),
      date: item.date || DEFAULT_ADVANCE.date,
      status: item.status || DEFAULT_ADVANCE.status,
      comments: item.comments,
      // Optional detailed fields
      concept_id: item.concept_id ? Number(item.concept_id) : undefined,
      concept_description: item.concept_description,
      concept_unit: item.concept_unit,
      concept_quantity: item.concept_quantity
        ? String(item.concept_quantity)
        : undefined,
      concept_unit_price: item.concept_unit_price
        ? String(item.concept_unit_price)
        : undefined,
      concept_classification: item.concept_classification,
      work_item_id: item.work_item_id ? Number(item.work_item_id) : undefined,
      work_item_name: item.work_item_name,
      catalog_id: item.catalog_id ? Number(item.catalog_id) : undefined,
      catalog_name: item.catalog_name,
      construction_id: item.construction_id
        ? Number(item.construction_id)
        : undefined,
      construction_name: item.construction_name,
      total_amount: item.total_amount
        ? String(item.total_amount)
        : undefined,
    };
  } catch (error) {
    console.error("❌ Error parsing Advance for Realm:", error);
    console.error("Original item:", item);
    throw error;
  }
};

/**
 * Parse array of Advances for Realm
 */
export const parseAdvancesForRealm = (
  items: PhysicalAdvanceResponse[],
): PhysicalAdvanceResponse[] => {
  if (!Array.isArray(items)) {
    console.warn("⚠️ Expected array of advances, got:", typeof items);
    return [];
  }

  return items.map(parseAdvanceForRealm);
};

/**
 * Validate Advance data
 */
export const validateAdvance = (item: PhysicalAdvanceResponse): boolean => {
  if (!item.id || !item.concept || !item.date) {
    console.warn(
      "⚠️ Advance missing required fields (id, concept, date):",
      item,
    );
    return false;
  }
  return true;
};

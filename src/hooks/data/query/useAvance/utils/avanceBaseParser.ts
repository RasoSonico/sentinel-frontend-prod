/**
 * Utility functions for converting AvanceBase API responses to Realm-compatible data structures
 */

import { AvanceBaseResponse } from "src/types/entities";

/**
 * Parse AvanceBase response for Realm
 * Ensures all nested data structures are properly formatted
 */
export const parseAvanceBaseForRealm = (
  data: AvanceBaseResponse,
): AvanceBaseResponse => {
  try {
    return {
      catalogs: data.catalogs.map((catalog) => ({
        id: Number(catalog.id) || 0,
        name: catalog.name || "",
        construction_id: Number(catalog.construction_id) || 0,
        construction_name: catalog.construction_name || "",
        work_items: catalog.work_items.map((workItem) => ({
          id: Number(workItem.id) || 0,
          name: workItem.name || "",
          concepts: workItem.concepts.map((concept) => ({
            id: Number(concept.id) || 0,
            description: concept.description || "",
            unit: concept.unit || "",
            quantity: String(concept.quantity || "0"),
            price: String(concept.price || "0"),
            clasification: concept.clasification || "",
            cumulative_volume: String(concept.cumulative_volume || "0"),
            quantity_left: String(concept.quantity_left || "0"),
          })),
        })),
      })),
      meta: {
        total_catalogs: Number(data.meta.total_catalogs) || 0,
        total_work_items: Number(data.meta.total_work_items) || 0,
        total_concepts: Number(data.meta.total_concepts) || 0,
        user_constructions: data.meta.user_constructions.map(Number),
        filters_applied: {
          construction_id: data.meta.filters_applied.construction_id
            ? Number(data.meta.filters_applied.construction_id)
            : null,
          active_only: data.meta.filters_applied.active_only ?? true,
        },
        generated_at: data.meta.generated_at || new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("❌ Error parsing AvanceBase for Realm:", error);
    console.error("Original data:", data);
    throw error;
  }
};

/**
 * Validate AvanceBase data
 */
export const validateAvanceBase = (data: AvanceBaseResponse): boolean => {
  if (!data.catalogs || !Array.isArray(data.catalogs)) {
    console.warn("⚠️ AvanceBase missing or invalid catalogs array");
    return false;
  }

  if (!data.meta) {
    console.warn("⚠️ AvanceBase missing meta information");
    return false;
  }

  return true;
};

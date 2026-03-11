/**
 * Utility functions for converting Concepto API responses to Realm-compatible data structures
 */

import { ConceptoItem } from "src/types/concepto";

/**
 * Default values for Concepto fields
 */
export const DEFAULT_CONCEPTO = {
  id: 0,
  catalog: 0,
  work_item: 0,
  description: "",
  unit: "",
  quantity: "0",
  unit_price: "0",
  clasification: "",
} as const;

/**
 * Parse single Concepto item for Realm
 */
export const parseConceptoItemForRealm = (
  item: ConceptoItem,
): ConceptoItem => {
  try {
    return {
      id: Number(item.id) || 0,
      catalog: Number(item.catalog) || DEFAULT_CONCEPTO.catalog,
      work_item: Number(item.work_item) || DEFAULT_CONCEPTO.work_item,
      description: item.description || DEFAULT_CONCEPTO.description,
      unit: item.unit || DEFAULT_CONCEPTO.unit,
      quantity: String(item.quantity || DEFAULT_CONCEPTO.quantity),
      unit_price: String(item.unit_price || DEFAULT_CONCEPTO.unit_price),
      clasification: item.clasification || DEFAULT_CONCEPTO.clasification,
    };
  } catch (error) {
    console.error("❌ Error parsing Concepto item for Realm:", error);
    console.error("Original item:", item);
    throw error;
  }
};

/**
 * Parse array of Concepto items for Realm
 */
export const parseConceptosForRealm = (
  items: ConceptoItem[],
): ConceptoItem[] => {
  if (!Array.isArray(items)) {
    console.warn("⚠️ Expected array of conceptos, got:", typeof items);
    return [];
  }

  return items.map(parseConceptoItemForRealm);
};

/**
 * Validate Concepto data
 */
export const validateConcepto = (item: ConceptoItem): boolean => {
  if (!item.id || !item.catalog || !item.work_item) {
    console.warn(
      "⚠️ Concepto missing required fields (id, catalog, work_item):",
      item,
    );
    return false;
  }
  return true;
};

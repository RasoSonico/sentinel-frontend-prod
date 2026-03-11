/**
 * Utility functions for converting Catalog API responses to Realm-compatible data structures
 */

import { CatalogoItem } from "src/types/catalogo";

/**
 * Default values for Catalog fields
 */
export const DEFAULT_CATALOG = {
  id: 0,
  construction: null,
  name: "",
  creation_date: new Date().toISOString(),
  is_active: true,
  reason_of_change: "",
} as const;

/**
 * Parse single Catalog item for Realm
 */
export const parseCatalogoItemForRealm = (
  item: CatalogoItem,
): CatalogoItem => {
  try {
    return {
      id: Number(item.id) || 0,
      construction: item.construction ? Number(item.construction) : null,
      name: item.name || DEFAULT_CATALOG.name,
      creation_date: item.creation_date || DEFAULT_CATALOG.creation_date,
      is_active: item.is_active ?? DEFAULT_CATALOG.is_active,
      reason_of_change: item.reason_of_change || DEFAULT_CATALOG.reason_of_change,
    };
  } catch (error) {
    console.error("❌ Error parsing Catalog item for Realm:", error);
    console.error("Original item:", item);
    throw error;
  }
};

/**
 * Parse array of Catalog items for Realm
 */
export const parseCatalogsForRealm = (
  items: CatalogoItem[],
): CatalogoItem[] => {
  if (!Array.isArray(items)) {
    console.warn("⚠️ Expected array of catalogs, got:", typeof items);
    return [];
  }

  return items.map(parseCatalogoItemForRealm);
};

/**
 * Validate Catalog data
 */
export const validateCatalog = (item: CatalogoItem): boolean => {
  if (!item.id || !item.name) {
    console.warn("⚠️ Catalog missing required fields (id, name):", item);
    return false;
  }
  return true;
};

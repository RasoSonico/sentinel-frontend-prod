/**
 * Utility functions for converting Partida API responses to Realm-compatible data structures
 */

import { PartidaItem } from "src/types/partida";

/**
 * Default values for Partida fields
 */
export const DEFAULT_PARTIDA = {
  id: 0,
  catalog: 0,
  name: "",
} as const;

/**
 * Parse single Partida item for Realm
 */
export const parsePartidaItemForRealm = (item: PartidaItem): PartidaItem => {
  try {
    return {
      id: Number(item.id) || 0,
      catalog: Number(item.catalog) || DEFAULT_PARTIDA.catalog,
      name: item.name || DEFAULT_PARTIDA.name,
    };
  } catch (error) {
    console.error("❌ Error parsing Partida item for Realm:", error);
    console.error("Original item:", item);
    throw error;
  }
};

/**
 * Parse array of Partida items for Realm
 */
export const parsePartidasForRealm = (items: PartidaItem[]): PartidaItem[] => {
  if (!Array.isArray(items)) {
    console.warn("⚠️ Expected array of partidas, got:", typeof items);
    return [];
  }

  return items.map(parsePartidaItemForRealm);
};

/**
 * Validate Partida data
 */
export const validatePartida = (item: PartidaItem): boolean => {
  if (!item.id || !item.catalog || !item.name) {
    console.warn("⚠️ Partida missing required fields (id, catalog, name):", item);
    return false;
  }
  return true;
};

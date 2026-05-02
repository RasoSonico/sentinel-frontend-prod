/**
 * Utility functions for converting API responses to Realm-compatible data structures
 * and providing default values for Construction entities
 */

import { Construction } from "src/types/entities";

/**
 * Default values for Construction fields
 */
export const DEFAULT_CONSTRUCTION = {
  id: "",
  name: "",
  description: "",
  location: "",
  budget: "0",
  start_date: "",
  end_date: "",
  status: "PLANNING" as const,
} as const;

/**
 * Parse Construction API response to Realm-compatible format
 * Ensures all IDs are strings and all required fields have values
 */
export const parseConstructionForRealm = (
  data: Construction | null,
): Partial<Construction> | null => {
  if (!data) {
    return null;
  }

  try {
    return {
      id: String(data.id),
      name: data.name || DEFAULT_CONSTRUCTION.name,
      description: data.description || DEFAULT_CONSTRUCTION.description,
      location: data.location || DEFAULT_CONSTRUCTION.location,
      country: data.country,
      state: data.state,
      client: data.client,
      budget: String(data.budget || DEFAULT_CONSTRUCTION.budget),
      creation_date: data.creation_date,
      start_date: data.start_date || DEFAULT_CONSTRUCTION.start_date,
      end_date: data.end_date || DEFAULT_CONSTRUCTION.end_date,
      status: data.status || DEFAULT_CONSTRUCTION.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("❌ Error parsing Construction for Realm:", error);
    console.error("Original data:", data);
    throw error;
  }
};

/**
 * Validate Construction data before storing in Realm
 */
export const validateConstruction = (data: Partial<Construction>): boolean => {
  const requiredFields = ["id", "name", "start_date", "end_date"];
  const missingFields = requiredFields.filter(
    (field) => !data[field as keyof Construction],
  );

  if (missingFields.length > 0) {
    console.warn("⚠️ Construction missing required fields:", missingFields);
    return false;
  }

  return true;
};

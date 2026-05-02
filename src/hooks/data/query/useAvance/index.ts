// Query hooks with Realm integration
export {
  useAvanceBase,
  useAvanceBaseFromRealm,
  avanceBaseOptions,
} from "./useAvanceBase";

export {
  useCatalogsByConstruction,
  useCatalogsByConstructionFromRealm,
  catalogsByConstructionOptions,
} from "./useCatalogsByConstruction";

export {
  usePartidasByCatalog,
  usePartidasByCatalogFromRealm,
  partidasByCatalogOptions,
} from "./usePartidasByCatalog";

export {
  useConceptsByWorkItem,
  useConceptsByWorkItemFromRealm,
  conceptsByWorkItemOptions,
} from "./useConceptsByWorkItem";

export {
  useAssignedConstruction,
  useAssignedConstructionFromRealm,
  assignedConstructionOptions,
} from "./useAssignedConstruction";

export {
  useAdvancesByCatalog,
  useAdvancesByCatalogFromRealm,
  advancesByCatalogOptions,
} from "./useAdvancesByCatalog";

// Mutation hooks
export { useSubmitAdvance } from "./useSubmitAdvance";
export { useUpdateAdvance } from "./useUpdateAdvance";

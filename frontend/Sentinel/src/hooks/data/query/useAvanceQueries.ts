import {
  queryOptions,
  skipToken,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import {
  submitAdvance,
  updateAdvance,
  getAdvancesByCatalog,
  getAssignedConstruction,
  getCatalogsByConstruction as getCatalogsByConstructionApi,
  getPartidasByCatalog,
  getConceptsByWorkItem,
  getAvanceBase,
} from "../api/avanceApi";
import { SubmitAdvance } from "src/types/avance";
import { AVANCE_QUERY_KEYS } from "./avanceQueries.const";

export const avanceBaseOptions = queryOptions({
  queryKey: [AVANCE_QUERY_KEYS.BASE],
  queryFn: getAvanceBase,
});

export const useAvanceBase = () => useQuery(avanceBaseOptions);

/**
 * Query para obtener catálogos de la construcción asignada al usuario
 */
export const catalogsByConstructionOptions = (
  constructionId: number | undefined,
) =>
  queryOptions({
    queryKey: [AVANCE_QUERY_KEYS.CATALOGS_BY_CONSTRUCTION, constructionId],
    queryFn: () => getCatalogsByConstructionApi(constructionId!),
    enabled: !!constructionId,
  });

export const useCatalogsByConstruction = (constructionId: number | undefined) =>
  useQuery(catalogsByConstructionOptions(constructionId));

/**
 * Query para obtener partidas de un catálogo específico
 */
export const usePartidasByCatalog = (catalogId: number | null) =>
  useQuery({
    queryKey: ["partidasByCatalog", catalogId],
    queryFn: () => getPartidasByCatalog(catalogId!),
    enabled: !!catalogId,
  });

/**
 * Query para obtener conceptos de una partida específica
 */
export const useConceptsByWorkItem = (workItemId: number | null) =>
  useQuery({
    queryKey: ["conceptsByWorkItem", workItemId],
    queryFn: () => getConceptsByWorkItem(workItemId!),
    enabled: !!workItemId,
  });

export const useSubmitAdvance = () =>
  useMutation({
    mutationKey: ["submitAdvance"],
    mutationFn: (advance: SubmitAdvance) => submitAdvance(advance),
  });

/**
 * Hook para editar un avance existente
 */
export const useUpdateAdvance = () =>
  useMutation({
    mutationKey: ["updateAdvance"],
    mutationFn: ({
      advanceId,
      updates,
    }: {
      advanceId: number;
      updates: {
        volume?: string;
        comments?: string;
        status?: "PENDING" | "APPROVED" | "REJECTED";
      };
    }) => updateAdvance(advanceId, updates),
  });

/**
 * Query para obtener la construcción asignada al usuario
 */
export const assignedConstructionOptions = (role: string = "CONTRATISTA") =>
  queryOptions({
    queryKey: [AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION, role],
    queryFn: () => getAssignedConstruction(role),
  });
export const useAssignedConstruction = (role: string = "CONTRATISTA") =>
  useQuery(assignedConstructionOptions(role));

/**
 * Query para obtener avances por catálogo con filtros
 */
export const advancesByCatalogOptions = ({
  catalogId,
  detailed = true,
}: {
  catalogId: number | undefined;
  detailed?: boolean;
}) =>
  queryOptions({
    queryKey: [AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG, catalogId, detailed],
    queryFn: () =>
      getAdvancesByCatalog({
        catalogId: catalogId!,
        detailed,
      }),
    enabled: !!catalogId,
  });

export const useAdvancesByCatalog = ({
  catalogId,
  detailed = true,
}: {
  catalogId: number | undefined;
  detailed?: boolean;
}) =>
  useQuery(
    advancesByCatalogOptions({
      catalogId,
      detailed,
    }),
  );

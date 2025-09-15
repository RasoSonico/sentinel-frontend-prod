import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getCatalogs,
  getConcepts,
  getPartidas,
  submitAdvance,
  updateAdvance,
  getAdvancesByCatalog,
  getAssignedConstruction,
  getCatalogsByConstruction as getCatalogsByConstructionApi,
  getPartidasByCatalog,
  getConceptsByWorkItem,
} from "../api/avanceApi";
import { AdvanceRegistration } from "src/types/entities";
import { SubmitAdvance } from "src/types/avance";

// DEPRECATED: Use useCatalogsByConstruction instead
export const useFetchCatalogs = () =>
  useQuery({
    queryKey: ["catalogs"],
    queryFn: getCatalogs,
  });

// DEPRECATED: Use usePartidasByCatalog instead
export const useFetchPartidas = () =>
  useQuery({
    queryKey: ["partidas"],
    queryFn: getPartidas,
  });

// DEPRECATED: Use useConceptsByWorkItem instead
export const useFetchConcepts = () =>
  useQuery({
    queryKey: ["concepts"],
    queryFn: getConcepts,
  });

/**
 * NEW HIERARCHICAL QUERIES - Following correct user permissions flow
 */

/**
 * Query para obtener catálogos de la construcción asignada al usuario
 */
export const useCatalogsByConstruction = (constructionId: number | null) =>
  useQuery({
    queryKey: ["catalogsByConstruction", constructionId],
    queryFn: () => getCatalogsByConstructionApi(constructionId!),
    enabled: !!constructionId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

/**
 * Query para obtener partidas de un catálogo específico
 */
export const usePartidasByCatalog = (catalogId: number | null) =>
  useQuery({
    queryKey: ["partidasByCatalog", catalogId],
    queryFn: () => getPartidasByCatalog(catalogId!),
    enabled: !!catalogId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

/**
 * Query para obtener conceptos de una partida específica
 */
export const useConceptsByWorkItem = (workItemId: number | null) =>
  useQuery({
    queryKey: ["conceptsByWorkItem", workItemId],
    queryFn: () => getConceptsByWorkItem(workItemId!),
    enabled: !!workItemId,
    staleTime: 10 * 60 * 1000, // 10 minutos
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

// Nuevas queries para AdvanceListScreen

/**
 * Query para obtener la construcción asignada al usuario
 */
export const useAssignedConstruction = (role: string = "CONTRATISTA") =>
  useQuery({
    queryKey: ["assignedConstruction", role],
    queryFn: () => getAssignedConstruction(role),
    staleTime: 30 * 60 * 1000, // 30 minutos - datos que no cambian frecuentemente
    gcTime: 60 * 60 * 1000, // 1 hora - mantener en caché más tiempo
  });


/**
 * Query para obtener avances por catálogo con filtros
 */
export const useAdvancesByCatalog = ({
  catalogId,
  status,
  startDate,
  endDate,
  date,
  page = 1,
  pageSize = 20,
  detailed = true,
  ordering = "-date", // Por defecto: más recientes primero
}: {
  catalogId: number | null;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  date?: string; // YYYY-MM-DD (single date)
  page?: number;
  pageSize?: number;
  detailed?: boolean;
  ordering?: string;
}) => {
  return useQuery({
    queryKey: ["advancesByCatalog", catalogId, status, startDate, endDate, date, page, pageSize, detailed, ordering],
    queryFn: () => {
      return getAdvancesByCatalog({ 
        catalogId: catalogId!, 
        status, 
        startDate,
        endDate,
        date,
        page, 
        pageSize,
        detailed,
        ordering
      });
    },
    enabled: !!catalogId,
    staleTime: 2 * 60 * 1000, // 2 minutos para datos más frescos
  });
};


// useConceptsByIds ya no es necesario con detailed=true
// La información viene directamente en los avances


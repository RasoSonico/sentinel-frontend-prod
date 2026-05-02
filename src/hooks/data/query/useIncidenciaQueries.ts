import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getIncidents,
  getIncidentById,
  getIncidentTypes,
  getIncidentClassifications,
  createIncident,
  updateIncident,
  patchIncident,
  deleteIncident,
} from "../api/incidenciaApi";
import {
  CreateIncident,
  UpdateIncident,
  IncidentFilters,
} from "src/types/incidencia";

/**
 * Queries para catálogos de incidencias
 */

/**
 * Query para obtener todos los tipos de incidencia
 */
export const useIncidentTypesQuery = () =>
  useQuery({
    queryKey: ["incidentTypes"],
    queryFn: () => getIncidentTypes(),
    staleTime: 30 * 60 * 1000, // 30 minutos - los catálogos cambian poco
    gcTime: 60 * 60 * 1000, // 1 hora
  });

/**
 * Query para obtener todas las clasificaciones de incidencia
 */
export const useIncidentClassificationsQuery = () =>
  useQuery({
    queryKey: ["incidentClassifications"],
    queryFn: () => getIncidentClassifications(),
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  });

/**
 * Queries principales de incidencias
 */

/**
 * Query para obtener incidencias con filtros
 */
export const useIncidentsQuery = (filters: IncidentFilters = {}) =>
  useQuery({
    queryKey: ["incidents", filters],
    queryFn: () => getIncidents(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos - datos más dinámicos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

/**
 * Query para obtener una incidencia específica
 */
export const useIncidentByIdQuery = (incidentId: number | null) =>
  useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => getIncidentById(incidentId!),
    enabled: !!incidentId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

/**
 * Mutations para operaciones CRUD de incidencias
 */

/**
 * Mutation para crear una nueva incidencia
 */
export const useCreateIncidentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (incident: CreateIncident) => createIncident(incident),
    onSuccess: () => {
      // Invalidar y refrescar las queries de incidencias
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
};

/**
 * Mutation para actualizar una incidencia completa
 */
export const useUpdateIncidentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      incidentId, 
      incident 
    }: { 
      incidentId: number; 
      incident: CreateIncident;
    }) => updateIncident(incidentId, incident),
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident", variables.incidentId] });
    },
  });
};

/**
 * Mutation para actualizar parcialmente una incidencia
 */
export const usePatchIncidentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      incidentId,
      updates,
    }: {
      incidentId: number;
      updates: UpdateIncident;
    }) => patchIncident(incidentId, updates),
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident", variables.incidentId] });
    },
  });
};

/**
 * Mutation para eliminar una incidencia
 */
export const useDeleteIncidentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (incidentId: number) => deleteIncident(incidentId),
    onSuccess: () => {
      // Invalidar queries de incidencias
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
};
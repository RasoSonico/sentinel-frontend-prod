import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Incident,
  CreateIncident,
  IncidentFilters,
} from "../../../types/incidencia";
import { RootState } from "../../store";

// Interfaces para el estado (simplificado - solo estado local/UI)
interface IncidenciaState {
  // Estado del formulario de nueva incidencia (mantenido para compatibilidad)
  newIncident: {
    data: CreateIncident | null;
    loading: boolean;
    error: string | null;
    success: boolean;
  };

  // Filtros actuales de búsqueda (para persistir entre navegaciones)
  filters: IncidentFilters;

  // Lista local para optimistic updates
  incidents: Incident[];
}

// Estado inicial
const initialState: IncidenciaState = {
  newIncident: {
    data: null,
    loading: false,
    error: null,
    success: false,
  },
  filters: {
    page: 1,
    page_size: 15,
    ordering: "-date", // Más recientes primero
  },
  incidents: [],
};

// Redux slice simplificado - solo para estado local/UI
// Los datos del servidor ahora se manejan con TanStack Query

const incidenciaSlice = createSlice({
  name: "incidencia",
  initialState,
  reducers: {
    // Gestión de filtros (persistir entre navegaciones)
    setFilters: (state, action: PayloadAction<Partial<IncidentFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters: (state) => {
      state.filters = {
        page: 1,
        page_size: 15,
        ordering: "-date",
      };
    },

    setPage: (state, action: PayloadAction<number>) => {
      state.filters.page = action.payload;
    },

    // Gestión del formulario de nueva incidencia (para compatibilidad)
    setNewIncidentData: (
      state,
      action: PayloadAction<CreateIncident | null>
    ) => {
      state.newIncident.data = action.payload;
      state.newIncident.success = false;
      state.newIncident.error = null;
    },

    clearNewIncident: (state) => {
      state.newIncident.data = null;
      state.newIncident.loading = false;
      state.newIncident.error = null;
      state.newIncident.success = false;
    },

    clearNewIncidentError: (state) => {
      state.newIncident.error = null;
    },

    resetNewIncidentSuccess: (state) => {
      state.newIncident.success = false;
    },

    // Operaciones optimistas para la lista (compatibilidad con TanStack Query)
    addIncidentToList: (state, action: PayloadAction<Incident>) => {
      state.incidents.unshift(action.payload);
    },

    updateIncidentInList: (state, action: PayloadAction<Incident>) => {
      const index = state.incidents.findIndex(
        (incident) => incident.id === action.payload.id
      );
      if (index !== -1) {
        state.incidents[index] = action.payload;
      }
    },

    removeIncidentFromList: (state, action: PayloadAction<number>) => {
      state.incidents = state.incidents.filter(
        (incident) => incident.id !== action.payload
      );
    },
  },
  // Ya no necesitamos extraReducers porque usamos TanStack Query
});

// Exportar acciones
export const {
  setFilters,
  clearFilters,
  setPage,
  setNewIncidentData,
  clearNewIncident,
  clearNewIncidentError,
  resetNewIncidentSuccess,
  addIncidentToList,
  updateIncidentInList,
  removeIncidentFromList,
} = incidenciaSlice.actions;

// Selectores simplificados
export const selectNewIncident = (state: RootState) => state.incidencia.newIncident;
export const selectIncidentFilters = (state: RootState) => state.incidencia.filters;
export const selectIncidentsList = (state: RootState) => state.incidencia.incidents;

export default incidenciaSlice.reducer;
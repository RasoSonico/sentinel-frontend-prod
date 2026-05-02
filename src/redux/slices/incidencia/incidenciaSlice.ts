import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Incident,
  IncidentType,
  IncidentClassification,
  CreateIncident,
  IncidentFilters,
} from "../../../types/incidencia";
import {
  getIncidents,
  getIncidentById,
  getIncidentTypes,
  getIncidentClassifications,
  createIncident,
} from "../../../hooks/data/api/incidenciaApi";
import { RootState } from "../../store";

// Interfaces para el estado
interface IncidenciaState {
  // Estado de incidencias
  incidents: {
    items: Incident[];
    loading: boolean;
    error: string | null;
    total: number;
    page: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  // Estado de catálogos de tipos y clasificaciones
  catalogs: {
    types: {
      items: IncidentType[];
      loading: boolean;
      error: string | null;
    };
    classifications: {
      items: IncidentClassification[];
      loading: boolean;
      error: string | null;
    };
  };

  // Incidencia seleccionada/actual
  currentIncident: {
    data: Incident | null;
    loading: boolean;
    error: string | null;
  };

  // Estado del formulario de nueva incidencia
  newIncident: {
    data: CreateIncident | null;
    loading: boolean;
    error: string | null;
    success: boolean;
  };

  // Filtros actuales de búsqueda
  filters: IncidentFilters;
}

// Estado inicial
const initialState: IncidenciaState = {
  incidents: {
    items: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  catalogs: {
    types: {
      items: [],
      loading: false,
      error: null,
    },
    classifications: {
      items: [],
      loading: false,
      error: null,
    },
  },
  currentIncident: {
    data: null,
    loading: false,
    error: null,
  },
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
};

// Thunks asíncronos

/**
 * Cargar tipos de incidencia
 */
export const fetchIncidentTypes = createAsyncThunk(
  "incidencia/fetchIncidentTypes",
  async (_, { rejectWithValue }) => {
    try {
      return await getIncidentTypes();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Error al obtener tipos de incidencia"
      );
    }
  }
);

/**
 * Cargar clasificaciones de incidencia
 */
export const fetchIncidentClassifications = createAsyncThunk(
  "incidencia/fetchIncidentClassifications",
  async (_, { rejectWithValue }) => {
    try {
      return await getIncidentClassifications();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Error al obtener clasificaciones de incidencia"
      );
    }
  }
);

/**
 * Cargar incidencias con filtros
 */
export const fetchIncidents = createAsyncThunk(
  "incidencia/fetchIncidents",
  async (filters: IncidentFilters, { rejectWithValue }) => {
    try {
      return await getIncidents(filters);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Error al obtener incidencias"
      );
    }
  }
);

/**
 * Cargar incidencia específica por ID
 */
export const fetchIncidentById = createAsyncThunk(
  "incidencia/fetchIncidentById",
  async (incidentId: number, { rejectWithValue }) => {
    try {
      return await getIncidentById(incidentId);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Error al obtener detalles de la incidencia"
      );
    }
  }
);

/**
 * Crear nueva incidencia
 */
export const createNewIncident = createAsyncThunk(
  "incidencia/createNewIncident",
  async (incident: CreateIncident, { rejectWithValue }) => {
    try {
      return await createIncident(incident);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Error al crear la incidencia"
      );
    }
  }
);

// Slice
const incidenciaSlice = createSlice({
  name: "incidencia",
  initialState,
  reducers: {
    // Establecer filtros de búsqueda
    setFilters: (state, action: PayloadAction<Partial<IncidentFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    // Limpiar filtros
    clearFilters: (state) => {
      state.filters = {
        page: 1,
        page_size: 15,
        ordering: "-date",
      };
    },

    // Establecer página
    setPage: (state, action: PayloadAction<number>) => {
      state.filters.page = action.payload;
    },

    // Establecer datos de nueva incidencia
    setNewIncidentData: (
      state,
      action: PayloadAction<CreateIncident | null>
    ) => {
      state.newIncident.data = action.payload;
      state.newIncident.success = false;
      state.newIncident.error = null;
    },

    // Limpiar estado de nueva incidencia
    clearNewIncident: (state) => {
      state.newIncident.data = null;
      state.newIncident.loading = false;
      state.newIncident.error = null;
      state.newIncident.success = false;
    },

    // Limpiar error de nueva incidencia
    clearNewIncidentError: (state) => {
      state.newIncident.error = null;
    },

    // Resetear estado de éxito de nueva incidencia
    resetNewIncidentSuccess: (state) => {
      state.newIncident.success = false;
    },

    // Limpiar incidencia actual
    clearCurrentIncident: (state) => {
      state.currentIncident.data = null;
      state.currentIncident.loading = false;
      state.currentIncident.error = null;
    },

    // Agregar incidencia a la lista (cuando se crea una nueva localmente)
    addIncidentToList: (state, action: PayloadAction<Incident>) => {
      state.incidents.items.unshift(action.payload);
      state.incidents.total += 1;
    },

    // Actualizar incidencia en la lista
    updateIncidentInList: (state, action: PayloadAction<Incident>) => {
      const index = state.incidents.items.findIndex(
        (incident) => incident.id === action.payload.id
      );
      if (index !== -1) {
        state.incidents.items[index] = action.payload;
      }
    },

    // Eliminar incidencia de la lista
    removeIncidentFromList: (state, action: PayloadAction<number>) => {
      state.incidents.items = state.incidents.items.filter(
        (incident) => incident.id !== action.payload
      );
      state.incidents.total -= 1;
    },
  },
  extraReducers: (builder) => {
    // Manejar fetchIncidentTypes
    builder
      .addCase(fetchIncidentTypes.pending, (state) => {
        state.catalogs.types.loading = true;
        state.catalogs.types.error = null;
      })
      .addCase(fetchIncidentTypes.fulfilled, (state, action) => {
        state.catalogs.types.loading = false;
        state.catalogs.types.items = action.payload;
      })
      .addCase(fetchIncidentTypes.rejected, (state, action) => {
        state.catalogs.types.loading = false;
        state.catalogs.types.error = action.payload as string;
      });

    // Manejar fetchIncidentClassifications
    builder
      .addCase(fetchIncidentClassifications.pending, (state) => {
        state.catalogs.classifications.loading = true;
        state.catalogs.classifications.error = null;
      })
      .addCase(fetchIncidentClassifications.fulfilled, (state, action) => {
        state.catalogs.classifications.loading = false;
        state.catalogs.classifications.items = action.payload;
      })
      .addCase(fetchIncidentClassifications.rejected, (state, action) => {
        state.catalogs.classifications.loading = false;
        state.catalogs.classifications.error = action.payload as string;
      });

    // Manejar fetchIncidents
    builder
      .addCase(fetchIncidents.pending, (state) => {
        state.incidents.loading = true;
        state.incidents.error = null;
      })
      .addCase(fetchIncidents.fulfilled, (state, action) => {
        state.incidents.loading = false;
        state.incidents.items = action.payload.incidents;
        state.incidents.total = action.payload.count;
        state.incidents.hasNextPage = !!action.payload.next;
        state.incidents.hasPreviousPage = !!action.payload.previous;
        state.incidents.page = state.filters.page || 1;
      })
      .addCase(fetchIncidents.rejected, (state, action) => {
        state.incidents.loading = false;
        state.incidents.error = action.payload as string;
      });

    // Manejar fetchIncidentById
    builder
      .addCase(fetchIncidentById.pending, (state) => {
        state.currentIncident.loading = true;
        state.currentIncident.error = null;
      })
      .addCase(fetchIncidentById.fulfilled, (state, action) => {
        state.currentIncident.loading = false;
        state.currentIncident.data = action.payload;
      })
      .addCase(fetchIncidentById.rejected, (state, action) => {
        state.currentIncident.loading = false;
        state.currentIncident.error = action.payload as string;
      });

    // Manejar createNewIncident
    builder
      .addCase(createNewIncident.pending, (state) => {
        state.newIncident.loading = true;
        state.newIncident.error = null;
        state.newIncident.success = false;
      })
      .addCase(createNewIncident.fulfilled, (state, action) => {
        state.newIncident.loading = false;
        state.newIncident.success = true;
        // Agregar la nueva incidencia al principio de la lista
        state.incidents.items.unshift(action.payload);
        state.incidents.total += 1;
      })
      .addCase(createNewIncident.rejected, (state, action) => {
        state.newIncident.loading = false;
        state.newIncident.error = action.payload as string;
      });
  },
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
  clearCurrentIncident,
  addIncidentToList,
  updateIncidentInList,
  removeIncidentFromList,
} = incidenciaSlice.actions;

// Selectores
export const selectIncidents = (state: RootState) => state.incidencia.incidents;
export const selectIncidentCatalogs = (state: RootState) => state.incidencia.catalogs;
export const selectCurrentIncident = (state: RootState) => state.incidencia.currentIncident;
export const selectNewIncident = (state: RootState) => state.incidencia.newIncident;
export const selectIncidentFilters = (state: RootState) => state.incidencia.filters;

export default incidenciaSlice.reducer;
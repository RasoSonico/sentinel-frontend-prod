import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IncidentType, IncidentClassification } from "src/types/incidencia";

interface IncidenciaFormDataState {
  typesById: Record<number, IncidentType>;
  classificationsById: Record<number, IncidentClassification>;
}

const initialState: IncidenciaFormDataState = {
  typesById: {},
  classificationsById: {},
};

const incidenciaFormDataSlice = createSlice({
  name: "incidenciaFormData",
  initialState,
  reducers: {
    setTypesById(state, action: PayloadAction<IncidentType[]>) {
      state.typesById = Object.fromEntries(
        action.payload.map((item) => [item.id, item])
      );
    },
    setClassificationsById(state, action: PayloadAction<IncidentClassification[]>) {
      state.classificationsById = Object.fromEntries(
        action.payload.map((item) => [item.id, item])
      );
    },
    clearIncidenciaFormData(state) {
      state.typesById = {};
      state.classificationsById = {};
    },
  },
});

export const {
  setTypesById,
  setClassificationsById,
  clearIncidenciaFormData,
} = incidenciaFormDataSlice.actions;

export default incidenciaFormDataSlice.reducer;
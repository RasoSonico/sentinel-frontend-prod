import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CatalogoItem } from "src/types/catalogo";
import { PartidaItem } from "src/types/partida";
import { ConceptoItem } from "src/types/concepto";

interface AvanceFormDataState {
  catalogsById: Record<number, CatalogoItem>;
  partidasById: Record<number, PartidaItem>;
  conceptsById: Record<number, ConceptoItem>;
}

const initialState: AvanceFormDataState = {
  catalogsById: {},
  partidasById: {},
  conceptsById: {},
};

const avanceFormDataSlice = createSlice({
  name: "avanceFormData",
  initialState,
  reducers: {
    setCatalogsById(state, action: PayloadAction<CatalogoItem[]>) {
      state.catalogsById = Object.fromEntries(
        action.payload.map((item) => [item.id, item])
      );
    },
    setPartidasById(state, action: PayloadAction<PartidaItem[]>) {
      state.partidasById = Object.fromEntries(
        action.payload.map((item) => [item.id, item])
      );
    },
    setConceptsById(state, action: PayloadAction<ConceptoItem[]>) {
      state.conceptsById = Object.fromEntries(
        action.payload.map((item) => [item.id, item])
      );
    },
    clearAvanceFormData(state) {
      state.catalogsById = {};
      state.partidasById = {};
      state.conceptsById = {};
    },
  },
});

export const {
  setCatalogsById,
  setPartidasById,
  setConceptsById,
  clearAvanceFormData,
} = avanceFormDataSlice.actions;

export default avanceFormDataSlice.reducer;

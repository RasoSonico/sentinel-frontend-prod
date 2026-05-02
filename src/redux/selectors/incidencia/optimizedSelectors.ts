import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../store';

// Selectores base para evitar recreación
const selectIncidenciaFormData = (state: RootState) => state.incidenciaFormData;
const selectTypesById = (state: RootState) => state.incidenciaFormData.typesById;
const selectClassificationsById = (state: RootState) => state.incidenciaFormData.classificationsById;

// Selector memoizado para tipo por ID
export const selectIncidentTypeById = createSelector(
  [selectTypesById, (_: RootState, id: number) => id],
  (typesById, id) => typesById[id] || null
);

// Selector memoizado para clasificación por ID
export const selectIncidentClassificationById = createSelector(
  [selectClassificationsById, (_: RootState, id: number) => id],
  (classificationsById, id) => classificationsById[id] || null
);

// Selector memoizado para nombre de tipo por ID
export const selectIncidentTypeNameById = createSelector(
  [selectIncidentTypeById],
  (type) => type?.name ?? ""
);

// Selector memoizado para nombre de clasificación por ID
export const selectIncidentClassificationNameById = createSelector(
  [selectIncidentClassificationById],
  (classification) => classification?.name ?? ""
);

// Selector memoizado para descripción de tipo por ID
export const selectIncidentTypeDescriptionById = createSelector(
  [selectIncidentTypeById],
  (type) => type?.description ?? ""
);

// Selector memoizado para descripción de clasificación por ID
export const selectIncidentClassificationDescriptionById = createSelector(
  [selectIncidentClassificationById],
  (classification) => classification?.description ?? ""
);

// Hooks optimizados con selectores memoizados
import { useSelector } from 'react-redux';

export const useOptimizedIncidentTypeById = (id: number) =>
  useSelector((state: RootState) => selectIncidentTypeById(state, id));

export const useOptimizedIncidentClassificationById = (id: number) =>
  useSelector((state: RootState) => selectIncidentClassificationById(state, id));

export const useOptimizedIncidentTypeNameById = (id: number) =>
  useSelector((state: RootState) => selectIncidentTypeNameById(state, id));

export const useOptimizedIncidentClassificationNameById = (id: number) =>
  useSelector((state: RootState) => selectIncidentClassificationNameById(state, id));

export const useOptimizedIncidentTypeDescriptionById = (id: number) =>
  useSelector((state: RootState) => selectIncidentTypeDescriptionById(state, id));

export const useOptimizedIncidentClassificationDescriptionById = (id: number) =>
  useSelector((state: RootState) => selectIncidentClassificationDescriptionById(state, id));
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import {
  Controller,
  Control,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import LabeledDropdown from "../../components/LabeledDropdown";
import QuantityInput from "../../components/QuantityInput";
import CompletionSwitch from "../../components/CompletionSwitch";
import StatusSection from "../../components/StatusSection";
import NotesInput from "../../components/NotesInput";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";
import {
  useCatalogsByConstruction,
  usePartidasByCatalog,
  useConceptsByWorkItem,
  useAssignedConstruction,
  useAvanceBase,
} from "src/hooks/data/query/useAvanceQueries";
import { CatalogoItem } from "src/types/catalogo";
import { DropdownItemType } from "src/components/ui/SearchableDropdown";
import { ConceptoItem } from "src/types/concepto";
import {
  AvanceBaseCatalog,
  AvanceBaseConcept,
  AvanceBaseWorkItem,
  Concept,
} from "src/types/entities";
import { PartidaItem } from "src/types/partida";
import { useDispatch } from "react-redux";
import {
  setCatalogsById,
  setPartidasById,
  setConceptsById,
} from "src/redux/slices/avance/avanceFormDataSlice";

interface AdvanceFormFieldsProps {
  control: Control<AdvanceFormFieldsZod>;
  errors: FieldErrors<AdvanceFormFieldsZod>;
  isCompleted: boolean | undefined;
  onCatalogSelect: (catalogId: number) => void;
  onPartidaSelect: (partidaId: number) => void;
  onConceptSelect: (conceptId: number) => void;
  setFormValue: UseFormSetValue<AdvanceFormFieldsZod>;
  watchFormValue: UseFormWatch<AdvanceFormFieldsZod>;
}

const AdvanceFormFields: React.FC<AdvanceFormFieldsProps> = ({
  control,
  errors,
  isCompleted,
  onCatalogSelect,
  onPartidaSelect,
  onConceptSelect,
  watchFormValue,
}) => {
  const dispatch = useDispatch();

  // Get assigned construction for CONTRATISTA
  const { data: assignedConstruction, isLoading: isLoadingConstruction } =
    useAssignedConstruction("CONTRATISTA");

  // Watch form values for hierarchical loading
  const selectedCatalogId = watchFormValue("catalog");
  const selectedPartidaId = watchFormValue("partida");
  const selectedConceptId = watchFormValue("concept");
  const [unit, setUnit] = useState("");

  const {
    data: catalogs,
    isLoading: isLoadingCatalogs,
    error: catalogsError,
    isError: isCatalogsError,
  } = useAvanceBase();

  const [partidas, setPartidas] = useState<AvanceBaseWorkItem[] | null>(null);

  useEffect(() => {
    if (catalogs && selectedCatalogId) {
      const foundCatalog = catalogs.find(
        (catalog) => catalog.id === selectedCatalogId
      );
      setPartidas(foundCatalog ? foundCatalog.work_items : []);
    } else {
      setPartidas(null);
    }
  }, [catalogs, selectedCatalogId]);

  const [concepts, setConcepts] = useState<AvanceBaseConcept[] | null>(null);

  useEffect(() => {
    if (partidas && selectedPartidaId) {
      const foundPartida = partidas.find(
        (partida) => partida.id === selectedPartidaId
      );
      setConcepts(foundPartida ? foundPartida.concepts : []);
    } else {
      setConcepts(null);
    }
  }, [partidas, selectedPartidaId]);

  // Update unit when concept is selected
  useEffect(() => {
    if (concepts && selectedConceptId) {
      const concept = concepts.find(
        (concept) => concept.id === selectedConceptId
      );
      setUnit(concept?.unit || "");
    } else {
      setUnit("");
    }
  }, [concepts, selectedConceptId]);

  const getCatalogsList = (catalogs: AvanceBaseCatalog[]): DropdownItemType[] =>
    catalogs && catalogs.length > 0
      ? catalogs.map((catalog: AvanceBaseCatalog) => ({
          value: catalog.id,
          label: catalog.name,
        }))
      : [];

  const getPartidasList = (
    partidas: AvanceBaseWorkItem[]
  ): DropdownItemType[] =>
    partidas && partidas.length > 0
      ? partidas.map((partida: AvanceBaseWorkItem) => ({
          value: partida.id,
          label: partida.name,
        }))
      : [];

  const getConceptsList = (concepts: AvanceBaseConcept[]): DropdownItemType[] =>
    concepts && concepts.length > 0
      ? concepts.map((concept: AvanceBaseConcept) => ({
          value: concept.id,
          label: concept.description,
        }))
      : [];

  return (
    <>
      <View>
        <Controller
          control={control}
          name="catalog"
          render={({ field: { value } }) => (
            <LabeledDropdown
              label="Catálogo"
              items={getCatalogsList(catalogs || [])}
              selected={value}
              onSelect={onCatalogSelect}
              error={errors.catalog?.message || catalogsError?.message}
              isLoading={isLoadingCatalogs || isLoadingConstruction}
              loadingLabel={
                isLoadingConstruction
                  ? "Cargando obra asignada..."
                  : "Cargando Catálogos"
              }
              disabled={isCatalogsError || !assignedConstruction}
            />
          )}
        />
      </View>

      <View>
        <Controller
          control={control}
          name="partida"
          render={({ field: { value } }) => (
            <LabeledDropdown
              label="Partida"
              items={getPartidasList(partidas || [])}
              selected={value}
              onSelect={onPartidaSelect}
              error={errors.partida?.message}
              disabled={!selectedCatalogId}
              isLoading={isLoadingCatalogs}
              loadingLabel="Cargando Partidas"
            />
          )}
        />
      </View>
      <View>
        <Controller
          control={control}
          name="concept"
          render={({ field: { value } }) => (
            <LabeledDropdown
              label="Concepto"
              items={getConceptsList(concepts || [])}
              selected={value}
              onSelect={onConceptSelect}
              error={errors.concept?.message}
              disabled={!selectedPartidaId}
              isLoading={isLoadingCatalogs}
              loadingLabel="Cargando Conceptos"
            />
          )}
        />
      </View>
      <View>
        <Controller
          control={control}
          name="quantity"
          render={({ field: { value, onChange } }) => (
            <QuantityInput
              quantity={value}
              onChange={onChange}
              unit={unit}
              error={errors.quantity?.message ?? null}
            />
          )}
        />
      </View>
      <Controller
        control={control}
        name="isCompleted"
        render={({ field: { value, onChange } }) => (
          <CompletionSwitch value={!!value} onValueChange={onChange} />
        )}
      />
      <StatusSection status={isCompleted ? "completed" : "onSchedule"} />
      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange } }) => (
          <NotesInput value={value || ""} onChange={onChange} />
        )}
      />
    </>
  );
};

export default AdvanceFormFields;

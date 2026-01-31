import React from "react";
import { View } from "react-native";
import {
  Controller,
  Control,
  FieldErrors,
  UseFormSetValue,
} from "react-hook-form";
import LabeledDropdown from "../../components/LabeledDropdown";
import QuantityInput from "../../components/QuantityInput";
import CompletionSwitch from "../../components/CompletionSwitch";
import StatusSection from "../../components/StatusSection";
import NotesInput from "../../components/NotesInput";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";
import {
  useAssignedConstruction,
  useAvanceBase,
} from "src/hooks/data/query/useAvance";
import { useAvanceFormFields } from "src/hooks/avance/useAvanceFormFields";

interface AdvanceFormFieldsProps {
  control: Control<AdvanceFormFieldsZod>;
  errors: FieldErrors<AdvanceFormFieldsZod>;
  isCompleted: boolean | undefined;
  onCatalogSelect: (catalogId: number) => void;
  onPartidaSelect: (partidaId: number) => void;
  onConceptSelect: (conceptId: number) => void;
  setFormValue: UseFormSetValue<AdvanceFormFieldsZod>;
}

const AdvanceFormFields: React.FC<AdvanceFormFieldsProps> = ({
  control,
  errors,
  isCompleted,
  onCatalogSelect,
  onPartidaSelect,
  onConceptSelect,
}) => {
  const { data: assignedConstruction, isLoading: isLoadingConstruction } =
    useAssignedConstruction("CONTRATISTA");

  const {
    data: avanceBase,
    isLoading: isLoadingCatalogs,
    error: catalogsError,
    isError: isCatalogsError,
  } = useAvanceBase();

  const {
    catalogOptions,
    workItemOptions,
    conceptOptions,
    selectedCatalogId,
    setSelectedCatalogId,
    selectedWorkItemId,
    setSelectedWorkItemId,
    setSelectedConceptId,
    selectedUnit,
  } = useAvanceFormFields(avanceBase);

  return (
    <>
      <View>
        <Controller
          control={control}
          name="catalog"
          render={({ field: { value } }) => (
            <LabeledDropdown
              label="Catálogo"
              items={catalogOptions}
              selected={value}
              onSelect={(catalogId) => {
                onCatalogSelect(catalogId);
                setSelectedCatalogId(catalogId);
              }}
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
              items={workItemOptions}
              selected={value}
              onSelect={(partidaId) => {
                onPartidaSelect(partidaId);
                setSelectedWorkItemId(partidaId);
              }}
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
              items={conceptOptions}
              selected={value}
              onSelect={(conceptId) => {
                onConceptSelect(conceptId);
                setSelectedConceptId(conceptId);
              }}
              error={errors.concept?.message}
              disabled={!selectedWorkItemId}
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
              unit={selectedUnit}
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

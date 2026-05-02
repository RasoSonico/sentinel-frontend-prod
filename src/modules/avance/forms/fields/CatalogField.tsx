import React, { useMemo } from "react";
import { View } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import LabeledDropdown from "../../components/LabeledDropdown";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";
import { useAdvanceFormContext } from "../context/AdvanceFormContext";

export function CatalogField() {
  const { control, formState: { errors } } = useFormContext<AdvanceFormFieldsZod>();
  const {
    catalogs,
    isLoadingAvanceBase,
    isLoadingConstruction,
    hasAssignedConstruction,
    catalogsError,
    isCatalogsError,
  } = useAdvanceFormContext();

  const catalogOptions = useMemo(() => {
    if (!catalogs) return [];
    return Array.from(catalogs).map((c) => ({ label: c.name, value: c.id }));
  }, [catalogs]);

  return (
    <View>
      <Controller
        control={control}
        name="catalog"
        render={({ field: { value, onChange } }) => (
          <LabeledDropdown
            label="Catálogo"
            items={catalogOptions}
            selected={value}
            onSelect={onChange}
            error={errors.catalog?.message || catalogsError?.message}
            isLoading={isLoadingAvanceBase || isLoadingConstruction}
            loadingLabel={
              isLoadingConstruction
                ? "Cargando obra asignada..."
                : "Cargando Catálogos"
            }
            disabled={isCatalogsError || !hasAssignedConstruction}
          />
        )}
      />
    </View>
  );
}

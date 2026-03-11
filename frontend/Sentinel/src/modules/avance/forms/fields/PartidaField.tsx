import React, { useMemo, useEffect, useRef } from "react";
import { View } from "react-native";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import LabeledDropdown from "../../components/LabeledDropdown";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";
import { useAdvanceFormContext } from "../context/AdvanceFormContext";

export function PartidaField() {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<AdvanceFormFieldsZod>();
  const { catalogs, isLoadingAvanceBase } = useAdvanceFormContext();

  const catalogId = useWatch({ control, name: "catalog" });
  const prevCatalogId = useRef(catalogId);

  const catalog = useMemo(() => {
    if (!catalogs || !catalogId) return null;
    return catalogs.find((c) => c.id === catalogId) ?? null;
  }, [catalogs, catalogId]);

  const workItemOptions = useMemo(() => {
    if (!catalog) return [];
    return Array.from(catalog.work_items).map((wi) => ({
      label: wi.name,
      value: wi.id,
    }));
  }, [catalog]);

  // Reset partida and concept when catalog changes
  useEffect(() => {
    if (prevCatalogId.current !== catalogId && prevCatalogId.current !== 0) {
      setValue("partida", 0);
      setValue("concept", 0);
    }
    prevCatalogId.current = catalogId;
  }, [catalogId, setValue]);

  return (
    <View>
      <Controller
        control={control}
        name="partida"
        render={({ field: { value, onChange } }) => (
          <LabeledDropdown
            quickSelect
            label="Partida"
            items={workItemOptions}
            selected={value}
            onSelect={onChange}
            error={errors.partida?.message}
            disabled={!catalogId}
            isLoading={isLoadingAvanceBase}
            loadingLabel="Cargando Partidas"
          />
        )}
      />
    </View>
  );
}

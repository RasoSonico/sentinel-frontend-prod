import React, { useMemo, useEffect, useRef } from "react";
import { View } from "react-native";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import LabeledDropdown from "../../components/LabeledDropdown";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";
import { useAdvanceFormContext } from "../context/AdvanceFormContext";

export function ConceptField() {
  const { control, setValue, formState: { errors } } = useFormContext<AdvanceFormFieldsZod>();
  const { catalogs, isLoadingAvanceBase } = useAdvanceFormContext();

  const catalogId = useWatch({ control, name: "catalog" });
  const partidaId = useWatch({ control, name: "partida" });
  const prevPartidaId = useRef(partidaId);

  const partida = useMemo(() => {
    if (!catalogs || !catalogId || !partidaId) return null;
    const catalog = catalogs.find((c) => c.id === catalogId);
    return catalog?.work_items.find((wi) => wi.id === partidaId) ?? null;
  }, [catalogs, catalogId, partidaId]);

  const conceptOptions = useMemo(() => {
    if (!partida) return [];
    return Array.from(partida.concepts).map((c) => ({
      label: c.description,
      value: c.id,
    }));
  }, [partida]);

  // Reset concept when partida changes
  useEffect(() => {
    if (prevPartidaId.current !== partidaId && prevPartidaId.current !== 0) {
      setValue("concept", 0);
    }
    prevPartidaId.current = partidaId;
  }, [partidaId, setValue]);

  return (
    <View>
      <Controller
        control={control}
        name="concept"
        render={({ field: { value, onChange } }) => (
          <LabeledDropdown
            label="Concepto"
            items={conceptOptions}
            selected={value}
            onSelect={onChange}
            error={errors.concept?.message}
            disabled={!partidaId}
            isLoading={isLoadingAvanceBase}
            loadingLabel="Cargando Conceptos"
          />
        )}
      />
    </View>
  );
}

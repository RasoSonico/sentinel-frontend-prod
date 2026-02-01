import React, { useMemo } from "react";
import { View } from "react-native";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import QuantityInput from "../../components/QuantityInput";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";
import { useAdvanceFormContext } from "../context/AdvanceFormContext";

export function QuantityField() {
  const { control, formState: { errors } } = useFormContext<AdvanceFormFieldsZod>();
  const { catalogs } = useAdvanceFormContext();

  const catalogId = useWatch({ control, name: "catalog" });
  const partidaId = useWatch({ control, name: "partida" });
  const conceptId = useWatch({ control, name: "concept" });

  const unit = useMemo(() => {
    if (!catalogs || !catalogId || !partidaId || !conceptId) return "";
    const catalog = catalogs.find((c) => c.id === catalogId);
    const partida = catalog?.work_items.find((wi) => wi.id === partidaId);
    const concept = partida?.concepts.find((c) => c.id === conceptId);
    return concept?.unit ?? "";
  }, [catalogs, catalogId, partidaId, conceptId]);

  return (
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
  );
}

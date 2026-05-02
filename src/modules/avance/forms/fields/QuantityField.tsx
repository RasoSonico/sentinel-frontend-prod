import React, { useMemo } from "react";
import { View } from "react-native";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import QuantityInput from "../../components/QuantityInput";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";
import { useAdvanceFormContext } from "../context/AdvanceFormContext";
import { ConceptProgressPanel } from "../components/ConceptProgressPanel";

export function QuantityField() {
  const {
    control,
    formState: { errors },
  } = useFormContext<AdvanceFormFieldsZod>();
  const { catalogs } = useAdvanceFormContext();

  const catalogId = useWatch({ control, name: "catalog" });
  const partidaId = useWatch({ control, name: "partida" });
  const conceptId = useWatch({ control, name: "concept" });
  const quantity = useWatch({ control, name: "quantity" });

  const concept = useMemo(() => {
    if (!catalogs || !catalogId || !partidaId || !conceptId) return null;
    const catalog = catalogs.find((c) => c.id === catalogId);
    const partida = catalog?.work_items.find((wi) => wi.id === partidaId);
    return partida?.concepts.find((c) => c.id === conceptId) ?? null;
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
            unit={concept?.unit ?? ""}
            error={errors.quantity?.message ?? null}
          />
        )}
      />
      {concept && (
        <ConceptProgressPanel concept={concept} inputValue={quantity ?? ""} />
      )}
    </View>
  );
}

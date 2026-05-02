import React from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import CompletionSwitch from "../../components/CompletionSwitch";
import StatusSection from "../../components/StatusSection";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";

export function CompletionField() {
  const { control } = useFormContext<AdvanceFormFieldsZod>();
  const isCompleted = useWatch({ control, name: "isCompleted" });

  return (
    <>
      <Controller
        control={control}
        name="isCompleted"
        render={({ field: { value, onChange } }) => (
          <CompletionSwitch value={!!value} onValueChange={onChange} />
        )}
      />
      <StatusSection status={isCompleted ? "completed" : "onSchedule"} />
    </>
  );
}

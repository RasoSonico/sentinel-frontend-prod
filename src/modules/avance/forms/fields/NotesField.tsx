import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import NotesInput from "../../components/NotesInput";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";

export function NotesField() {
  const { control } = useFormContext<AdvanceFormFieldsZod>();

  return (
    <Controller
      control={control}
      name="notes"
      render={({ field: { value, onChange } }) => (
        <NotesInput value={value || ""} onChange={onChange} />
      )}
    />
  );
}

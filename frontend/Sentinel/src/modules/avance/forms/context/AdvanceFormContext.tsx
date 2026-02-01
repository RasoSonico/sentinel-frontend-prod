import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useForm, FormProvider, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  advanceFormDefaultValues,
  AdvanceFormFieldsZod,
  advanceFormSchema,
} from "../util/advanceFormValidation";
import {
  useAvanceBase,
  useAssignedConstruction,
} from "src/hooks/data/query/useAvance";
import { AvanceBaseResponse } from "src/realm/avanceBase/Response";
import { AvanceBaseCatalog } from "src/realm/avanceBase/Catalog";

interface AdvanceFormContextValue {
  constructionId: number;
  avanceBase: AvanceBaseResponse | null;
  catalogs: Realm.List<AvanceBaseCatalog> | undefined;
  isLoadingAvanceBase: boolean;
  isLoadingConstruction: boolean;
  hasAssignedConstruction: boolean;
  catalogsError: Error | null;
  isCatalogsError: boolean;
}

const AdvanceFormContext = createContext<AdvanceFormContextValue | null>(null);

export function useAdvanceFormContext() {
  const context = useContext(AdvanceFormContext);
  if (!context) {
    throw new Error(
      "useAdvanceFormContext must be used within AdvanceFormProvider"
    );
  }
  return context;
}

interface AdvanceFormProviderProps {
  constructionId: number;
  children: ReactNode;
}

export function AdvanceFormProvider({
  constructionId,
  children,
}: AdvanceFormProviderProps) {
  const methods = useForm<AdvanceFormFieldsZod>({
    resolver: zodResolver(advanceFormSchema),
    mode: "onBlur",
    defaultValues: advanceFormDefaultValues,
  });

  const { data: assignedConstruction, isLoading: isLoadingConstruction } =
    useAssignedConstruction("CONTRATISTA");

  const {
    data: avanceBase,
    isInitialLoading: isLoadingAvanceBase,
    error: catalogsError,
    isError: isCatalogsError,
  } = useAvanceBase();

  const contextValue = useMemo<AdvanceFormContextValue>(
    () => ({
      constructionId,
      avanceBase,
      catalogs: avanceBase?.catalogs,
      isLoadingAvanceBase,
      isLoadingConstruction,
      hasAssignedConstruction: !!assignedConstruction,
      catalogsError: catalogsError as Error | null,
      isCatalogsError,
    }),
    [
      constructionId,
      avanceBase,
      isLoadingAvanceBase,
      isLoadingConstruction,
      assignedConstruction,
      catalogsError,
      isCatalogsError,
    ]
  );

  return (
    <AdvanceFormContext.Provider value={contextValue}>
      <FormProvider {...methods}>{children}</FormProvider>
    </AdvanceFormContext.Provider>
  );
}

import { useMemo } from "react";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";
import { useHubDiario } from "src/hooks/data/query/useMaquinaria";

export const useHubDiarioData = () => {
  const {
    data: assignedConstruction,
    isInitialLoading: loadingConstruction,
    refetch: refetchConstruction,
  } = useAssignedConstruction("CONTRATISTA");

  const constructionId = useMemo(
    () =>
      assignedConstruction?.id ? Number(assignedConstruction.id) : undefined,
    [assignedConstruction?.id],
  );

  const {
    data: hub,
    isInitialLoading: loadingHub,
    isFetching,
    isError,
    error,
    refetch: refetchHub,
    hasOfflineData,
  } = useHubDiario(constructionId);

  const isLoading = loadingConstruction || loadingHub;

  const refetch = () => {
    refetchConstruction();
    refetchHub();
  };

  return {
    hub,
    constructionId,
    assignedConstruction,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    hasOfflineData,
  };
};

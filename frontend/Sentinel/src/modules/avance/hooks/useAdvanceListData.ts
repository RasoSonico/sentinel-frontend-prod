import { useMemo } from "react";
import {
  useCatalogsByConstruction,
  useAdvancesByCatalog,
} from "src/hooks/data/query/useAvance";
import { PhysicalAdvanceResponse } from "src/realm/avanceByCatalog/PhysicalAdvanceResponse";

export type StatusFilter = "all" | "pending" | "approved" | "rejected";

interface UseAdvanceListDataProps {
  constructionId: number;
  constructionName: string;
  statusFilter: StatusFilter;
  startDate?: string;
  endDate?: string;
  singleDate?: string;
}

const filterByStatus = (
  advances:
    | Realm.List<PhysicalAdvanceResponse>
    | PhysicalAdvanceResponse[]
    | null,
  filter: StatusFilter,
): PhysicalAdvanceResponse[] => {
  if (!advances || advances.length === 0) return [];

  // Convert Realm.List to array for filtering
  const advancesArray = Array.from(advances);

  if (filter === "all") return advancesArray;

  return advancesArray.filter((advance) => {
    switch (filter) {
      case "pending":
        return advance.status === "PENDING";
      case "approved":
        return advance.status === "APPROVED";
      case "rejected":
        return advance.status === "REJECTED";
      default:
        return true;
    }
  });
};

const filterByDateRange = (
  advances: PhysicalAdvanceResponse[],
  startDateStr: string,
  endDateStr: string,
): PhysicalAdvanceResponse[] => {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  return advances.filter((advance) => {
    const advanceDate = new Date(advance.date);
    return advanceDate >= startDate && advanceDate <= endDate;
  });
};

const filterBySingleDate = (
  advances: PhysicalAdvanceResponse[],
  singleDateStr: string,
): PhysicalAdvanceResponse[] => {
  const singleDate = new Date(singleDateStr);
  return advances.filter((advance) => {
    const advanceDate = new Date(advance.date);
    return (
      advanceDate.getFullYear() === singleDate.getFullYear() &&
      advanceDate.getMonth() === singleDate.getMonth() &&
      advanceDate.getDate() === singleDate.getDate()
    );
  });
};

const calculateSummary = (
  advances: Realm.List<PhysicalAdvanceResponse> | PhysicalAdvanceResponse[] | null,
) => {
  if (!advances || advances.length === 0) return null;

  // Work directly with Realm.List without converting to array
  let total = 0;
  let pending = 0;
  let approved = 0;
  let rejected = 0;

  // Iterate through Realm.List efficiently
  for (let i = 0; i < advances.length; i++) {
    const advance = advances[i];
    total++;

    switch (advance.status) {
      case "PENDING":
        pending++;
        break;
      case "APPROVED":
        approved++;
        break;
      case "REJECTED":
        rejected++;
        break;
    }
  }

  return {
    total,
    pending,
    approved,
    rejected,
  };
};

export const useAdvanceListData = ({
  constructionId,
  constructionName,
  statusFilter,
  endDate,
  singleDate,
  startDate,
}: UseAdvanceListDataProps) => {
  // Build a minimal assignedConstruction object for compatibility with existing components
  const assignedConstruction = useMemo(
    () => ({
      id: constructionId,
      name: constructionName,
    }),
    [constructionId, constructionName],
  );

  // No loading state for construction since it's passed in
  const loadingConstruction = false;
  const constructionError = null;
  const refetchConstruction = async () => {};

  // Fetch catalogs for the assigned construction
  const {
    data: catalogs,
    isLoading: loadingCatalogs,
    error: catalogsError,
  } = useCatalogsByConstruction(constructionId);

  // Get the main catalog (first one)
  // catalogs is already an array from the hook
  const mainCatalog = useMemo(() => {
    return catalogs?.[0];
  }, [catalogs]);

  // Memoize catalog ID to prevent unnecessary re-renders
  const catalogId = useMemo(() => {
    return mainCatalog?.id;
  }, [mainCatalog?.id]);

  // Fetch advances for the main catalog
  // Returns Realm object with advances as Realm.List
  const {
    data: advancesByCatalog,
    isLoading: loadingAdvances,
    error: advancesError,
    refetch: refetchAdvances,
  } = useAdvancesByCatalog({
    catalogId,
    detailed: true,
  });

  // Get the Realm.List of advances directly
  // Don't convert to array yet - keep as Realm.List
  const allAdvancesRealmList: Realm.List<PhysicalAdvanceResponse> | null =
    useMemo(() => {
      return advancesByCatalog?.advances ?? null;
    }, [advancesByCatalog?.advances]);

  // Calculate summary directly from Realm.List for better performance
  const summary = useMemo(() => {
    return calculateSummary(allAdvancesRealmList);
  }, [allAdvancesRealmList]);

  // Filter advances - this will convert to array only when needed
  const filteredAdvances = useMemo(() => {
    if (!allAdvancesRealmList || allAdvancesRealmList.length === 0) return [];

    // Apply status filter (converts to array)
    let filtered = filterByStatus(allAdvancesRealmList, statusFilter);

    // Apply date filters
    if (startDate && endDate) {
      filtered = filterByDateRange(filtered, startDate, endDate);
    } else if (singleDate) {
      filtered = filterBySingleDate(filtered, singleDate);
    }

    return filtered;
  }, [allAdvancesRealmList, statusFilter, startDate, endDate, singleDate]);

  return {
    // Data
    assignedConstruction,
    catalogs,
    mainCatalog,
    advances: filteredAdvances,
    summary,

    // Loading states
    loadingConstruction,
    loadingCatalogs,
    loadingAdvances,

    // Errors
    constructionError,
    catalogsError,
    advancesError,

    // Refetch functions
    refetchConstruction,
    refetchAdvances,
  };
};

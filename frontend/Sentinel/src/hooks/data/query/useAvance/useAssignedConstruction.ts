import { useCallback, useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getAssignedConstructions } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { AssignedConstructionResponse } from "src/realm/assignedConstruction/Response";
import { ConstructionRealm } from "src/realm/assignedConstruction/Construction";
import { AVANCE_QUERY_KEYS } from "../avanceQueries.const";
import {
  parseConstructionsForRealm,
  logApiFetchStart,
  logApiResponse,
  logNoApiData,
  logRealmStoreStart,
  logPreparedData,
  logRealmStoreSuccess,
  logRealmStoreError,
  logRealmVerification,
  logHookState,
  logOfflineMode,
} from "./utils";

export const assignedConstructionOptions = (
  role: string = "CONTRATISTA",
  realm: Realm,
  isOnline: boolean | null,
) =>
  queryOptions({
    queryKey: [AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION, role],
    queryFn: async () => {
      logApiFetchStart("Assigned Constructions");
      // Note: If this throws (network error, server error), Realm is not modified
      // and TanStack Query will set isError=true. Cached data persists automatically.
      const data = await getAssignedConstructions(role);

      logApiResponse("Assigned Constructions", data);

      // Empty response is valid - user genuinely has no constructions assigned
      // We need to clear the cached data to reflect this
      if (!data || data.length === 0) {
        logNoApiData("Assigned Constructions");
        try {
          realm.write(() => {
            const existing = realm.objectForPrimaryKey<AssignedConstructionResponse>(
              "AssignedConstructionResponse",
              `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
            );

            if (existing) {
              // Properly clear the list - splice removes all items
              existing.constructions.splice(0, existing.constructions.length);
              existing.selectedConstructionId = null;
              existing.updatedAt = new Date();
            }
          });
          logRealmStoreSuccess("cleared Assigned Constructions");
        } catch (error) {
          logRealmStoreError("clearing Assigned Constructions", error);
        }
        return [];
      }

      logRealmStoreStart("Assigned Constructions");

      try {
        // Parse data for Realm
        const constructionsData = parseConstructionsForRealm(data);
        logPreparedData("Assigned Constructions", constructionsData);

        // Store in Realm
        realm.write(() => {
          // First, create or update all Construction objects
          constructionsData.forEach((constructionData) => {
            realm.create("ConstructionRealm", constructionData, UpdateMode.Modified);
          });

          // Get existing record to preserve selectedConstructionId
          const existing = realm.objectForPrimaryKey<AssignedConstructionResponse>(
            "AssignedConstructionResponse",
            `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
          );

          // Get the construction references
          const constructionRefs = constructionsData
            .map((c) => realm.objectForPrimaryKey(ConstructionRealm, c._id))
            .filter((c): c is ConstructionRealm => c !== null);

          // Determine selectedConstructionId
          let selectedId = existing?.selectedConstructionId ?? null;
          // If the previously selected construction is no longer in the list, reset to first
          if (selectedId && !constructionsData.some((c) => c._id === selectedId)) {
            selectedId = constructionsData[0]?._id ?? null;
          }
          // If no selection yet, default to first
          if (!selectedId && constructionsData.length > 0) {
            selectedId = constructionsData[0]._id;
          }

          realm.create(
            "AssignedConstructionResponse",
            {
              _id: `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
              constructions: constructionRefs,
              selectedConstructionId: selectedId,
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });

        logRealmStoreSuccess("Assigned Constructions");

        // Verify the write
        const verification = realm.objectForPrimaryKey<AssignedConstructionResponse>(
          "AssignedConstructionResponse",
          `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
        );
        logRealmVerification(
          "Assigned Constructions",
          !!verification,
          verification?.constructions?.length ?? 0,
        );
      } catch (error) {
        logRealmStoreError("Assigned Constructions", error, data);
        throw error;
      }

      return data;
    },
    enabled: isOnline === true,
  });

export const useAssignedConstruction = (role: string = "CONTRATISTA") => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();

  const cached = useObject(
    AssignedConstructionResponse,
    `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
  );

  const q = useQuery(assignedConstructionOptions(role, realm, isOnline));

  // Get constructions array from cached data
  const constructions = useMemo(() => {
    if (!cached?.constructions) return [];
    return Array.from(cached.constructions);
  }, [cached?.constructions]);

  // Find selected construction
  const selectedConstruction = useMemo(() => {
    if (constructions.length === 0) return null;
    const selectedId = cached?.selectedConstructionId;
    if (selectedId) {
      const found = constructions.find((c) => c.id === selectedId);
      if (found) return found;
    }
    // Default to first construction
    return constructions[0] ?? null;
  }, [constructions, cached?.selectedConstructionId]);

  // Function to update selected construction
  const setSelectedConstruction = useCallback(
    (constructionId: string) => {
      if (!cached) return;

      realm.write(() => {
        const record = realm.objectForPrimaryKey<AssignedConstructionResponse>(
          "AssignedConstructionResponse",
          `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
        );
        if (record) {
          record.selectedConstructionId = constructionId;
        }
      });
    },
    [realm, role, cached],
  );

  logHookState("useAssignedConstruction", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: {
      constructionsCount: cached?.constructions?.length ?? 0,
      selectedId: cached?.selectedConstructionId,
    },
    queryState: {
      isLoading: q.isLoading,
      isPending: q.isPending,
      isSuccess: q.isSuccess,
      isError: q.isError,
      dataCount: q.data?.length ?? 0,
    },
  });

  if (!isOnline && cached) {
    logOfflineMode("Assigned Constructions", cached);
  }

  return {
    ...q,
    // Legacy compatibility: single construction
    data: selectedConstruction,
    // New multi-construction support
    constructions,
    selectedConstruction,
    setSelectedConstruction,
    hasOfflineData: !!cached,
    isInitialLoading: !cached && q.isPending,
  };
};

export const useAssignedConstructionFromRealm = (
  role: string = "CONTRATISTA",
) =>
  useObject(
    AssignedConstructionResponse,
    `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
  );

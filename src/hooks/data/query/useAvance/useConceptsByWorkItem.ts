import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getConceptsByWorkItem } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { ConceptsByWorkItemResponse } from "src/realm/conceptsByWorkItem/Response";
import { AVANCE_QUERY_KEYS } from "../avanceQueries.const";
import {
  parseConceptosForRealm,
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
  logArrayLength,
} from "./utils";

export const conceptsByWorkItemOptions = (
  workItemId: number | null,
  realm: Realm,
  isOnline: boolean | null,
) =>
  queryOptions({
    queryKey: [AVANCE_QUERY_KEYS.CONCEPTS_BY_WORK_ITEM, workItemId],
    queryFn: async () => {
      logApiFetchStart("Concepts By WorkItem");
      const data = await getConceptsByWorkItem(workItemId!);

      logApiResponse("Concepts By WorkItem", data);
      logArrayLength("Concepts", data?.length || 0);

      if (!data || data.length === 0) {
        logNoApiData("Concepts By WorkItem");
        // Store empty array
        try {
          realm.write(() => {
            realm.create(
              "ConceptsByWorkItemResponse",
              {
                _id: `${AVANCE_QUERY_KEYS.CONCEPTS_BY_WORK_ITEM}-${workItemId}`,
                concepts: [],
                updatedAt: new Date(),
              },
              UpdateMode.Modified,
            );
          });
          logRealmStoreSuccess("empty Concepts");
        } catch (error) {
          logRealmStoreError("empty Concepts", error);
        }
        return [];
      }

      logRealmStoreStart("Concepts By WorkItem");

      try {
        // Parse data for Realm
        const conceptsData = parseConceptosForRealm(data);
        logPreparedData("Concepts By WorkItem", conceptsData);

        // Store in Realm
        realm.write(() => {
          realm.create(
            "ConceptsByWorkItemResponse",
            {
              _id: `${AVANCE_QUERY_KEYS.CONCEPTS_BY_WORK_ITEM}-${workItemId}`,
              concepts: conceptsData,
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });

        logRealmStoreSuccess("Concepts By WorkItem");

        // Verify the write
        const verification = realm.objectForPrimaryKey(
          "ConceptsByWorkItemResponse",
          `${AVANCE_QUERY_KEYS.CONCEPTS_BY_WORK_ITEM}-${workItemId}`,
        );
        logRealmVerification(
          "Concepts By WorkItem",
          !!verification,
          verification?.concepts,
        );
      } catch (error) {
        logRealmStoreError("Concepts By WorkItem", error, data);
        throw error;
      }

      return data;
    },
    enabled: !!workItemId && isOnline === true,
  });

export const useConceptsByWorkItem = (workItemId: number | null) => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();

  const cached = useObject(
    ConceptsByWorkItemResponse,
    `${AVANCE_QUERY_KEYS.CONCEPTS_BY_WORK_ITEM}-${workItemId}`,
  );

  const q = useQuery(conceptsByWorkItemOptions(workItemId, realm, isOnline));

  logHookState("useConceptsByWorkItem", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: cached?.concepts ? `${cached.concepts.length} concepts` : null,
    queryState: {
      isLoading: q.isLoading,
      isPending: q.isPending,
      isSuccess: q.isSuccess,
      isError: q.isError,
    },
  });

  if (!isOnline && cached) {
    logOfflineMode("Concepts By WorkItem", cached);
  }

  return {
    ...q,
    data: cached?.concepts ? Array.from(cached.concepts) : [],
    hasOfflineData: !!cached,
    isInitialLoading: !cached && q.isPending,
  };
};

export const useConceptsByWorkItemFromRealm = (workItemId: number | null) =>
  useObject(
    ConceptsByWorkItemResponse,
    `${AVANCE_QUERY_KEYS.CONCEPTS_BY_WORK_ITEM}-${workItemId}`,
  );

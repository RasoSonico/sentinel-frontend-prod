import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getAssignedConstruction } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { AssignedConstructionResponse } from "src/realm/assignedConstruction/Response";
import { AVANCE_QUERY_KEYS } from "../avanceQueries.const";
import {
  parseConstructionForRealm,
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
      logApiFetchStart("Assigned Construction");
      const data = await getAssignedConstruction(role);

      logApiResponse("Assigned Construction", data);

      if (!data) {
        logNoApiData("Assigned Construction");
        // Store null to clear any old data
        try {
          realm.write(() => {
            realm.create(
              "AssignedConstructionResponse",
              {
                _id: `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
                construction: null,
                updatedAt: new Date(),
              },
              UpdateMode.Modified,
            );
          });
          logRealmStoreSuccess("null Assigned Construction");
        } catch (error) {
          logRealmStoreError("null Assigned Construction", error);
        }
        return null;
      }

      logRealmStoreStart("Assigned Construction");

      try {
        // Parse data for Realm
        const constructionData = parseConstructionForRealm(data);
        logPreparedData("Assigned Construction", constructionData);

        // Store in Realm
        realm.write(() => {
          realm.create(
            "AssignedConstructionResponse",
            {
              _id: `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
              construction: constructionData,
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });

        logRealmStoreSuccess("Assigned Construction");

        // Verify the write
        const verification = realm.objectForPrimaryKey(
          "AssignedConstructionResponse",
          `${AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION}-${role}`,
        );
        logRealmVerification(
          "Assigned Construction",
          !!verification,
          verification?.construction,
        );
      } catch (error) {
        logRealmStoreError("Assigned Construction", error, data);
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

  logHookState("useAssignedConstruction", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: cached?.construction,
    queryState: {
      isLoading: q.isLoading,
      isPending: q.isPending,
      isSuccess: q.isSuccess,
      isError: q.isError,
      data: q.data,
    },
  });

  if (!isOnline && cached) {
    logOfflineMode("Assigned Construction", cached);
  }

  return {
    ...q,
    data: cached?.construction ?? null,
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

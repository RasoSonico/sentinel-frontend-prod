import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getAvanceBase } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { AvanceBaseResponse } from "src/realm/avanceBase/Response";
import { AVANCE_QUERY_KEYS } from "../avanceQueries.const";
import {
  parseAvanceBaseForRealm,
  validateAvanceBase,
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

export const avanceBaseOptions = (realm: Realm, isOnline: boolean | null) =>
  queryOptions({
    queryKey: [AVANCE_QUERY_KEYS.BASE],
    enabled: isOnline === true,
    // Static key shared across all users — must refetch on mount so User 2 never
    // sees User 1's stale data that PersistQueryClientProvider rehydrated from AsyncStorage.
    refetchOnMount: true,
    queryFn: async () => {
      logApiFetchStart("Avance Base");
      const data = await getAvanceBase();

      logApiResponse("Avance Base", data);

      if (!data || !validateAvanceBase(data)) {
        logNoApiData("Avance Base");
        return data;
      }

      logRealmStoreStart("Avance Base");

      try {
        // Parse data for Realm
        const avanceBaseData = parseAvanceBaseForRealm(data);
        logPreparedData("Avance Base", {
          catalogsCount: avanceBaseData.catalogs.length,
          meta: avanceBaseData.meta,
        });

        // Store in Realm
        realm.write(() => {
          realm.create(
            "AvanceBaseResponse",
            {
              _id: AVANCE_QUERY_KEYS.BASE,
              catalogs: avanceBaseData.catalogs,
              meta: avanceBaseData.meta,
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });

        logRealmStoreSuccess("Avance Base");

        // Verify the write
        const verification = realm.objectForPrimaryKey(
          "AvanceBaseResponse",
          AVANCE_QUERY_KEYS.BASE,
        );
        logRealmVerification("Avance Base", !!verification, {
          catalogsCount: verification?.catalogs?.length,
          meta: verification?.meta,
        });
      } catch (error) {
        logRealmStoreError("Avance Base", error, data);
        throw error;
      }

      return data;
    },
  });

export const useAvanceBase = () => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();

  // Reactive Realm read
  const cached = useObject(AvanceBaseResponse, AVANCE_QUERY_KEYS.BASE);

  // Network orchestrator (writes to Realm)
  const q = useQuery(avanceBaseOptions(realm, isOnline));

  logHookState("useAvanceBase", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: cached
      ? {
          catalogsCount: cached.catalogs?.length,
          totalCatalogs: cached.meta?.total_catalogs,
        }
      : null,
    queryState: {
      isLoading: q.isLoading,
      isPending: q.isPending,
      isSuccess: q.isSuccess,
      isError: q.isError,
    },
  });

  if (!isOnline && cached) {
    logOfflineMode("Avance Base", cached);
  }

  return {
    ...q,

    // UI data always comes from Realm when available
    data: cached ?? null,

    hasOfflineData: !!cached,
    isInitialLoading: !cached && q.isPending,
  };
};

export const useAvanceBaseFromRealm = () =>
  useObject(AvanceBaseResponse, AVANCE_QUERY_KEYS.BASE);

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getCatalogsByConstruction as getCatalogsByConstructionApi } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { CatalogsByConstructionResponse } from "src/realm/catalogsByConstruction/Response";
import { AVANCE_QUERY_KEYS } from "../avanceQueries.const";
import {
  parseCatalogsForRealm,
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

export const catalogsByConstructionOptions = (
  constructionId: number | undefined,
  realm: Realm,
  isOnline: boolean | null,
) =>
  queryOptions({
    queryKey: [AVANCE_QUERY_KEYS.CATALOGS_BY_CONSTRUCTION, constructionId],
    queryFn: async () => {
      logApiFetchStart("Catalogs By Construction");
      const data = await getCatalogsByConstructionApi(constructionId!);

      logApiResponse("Catalogs By Construction", data);
      logArrayLength("Catalogs", data?.length || 0);

      if (!data || data.length === 0) {
        logNoApiData("Catalogs By Construction");
        // Store empty array
        try {
          realm.write(() => {
            realm.create(
              "CatalogsByConstructionResponse",
              {
                _id: `${AVANCE_QUERY_KEYS.CATALOGS_BY_CONSTRUCTION}-${constructionId}`,
                catalogs: [],
                updatedAt: new Date(),
              },
              UpdateMode.Modified,
            );
          });
          logRealmStoreSuccess("empty Catalogs");
        } catch (error) {
          logRealmStoreError("empty Catalogs", error);
        }
        return [];
      }

      logRealmStoreStart("Catalogs By Construction");

      try {
        // Parse data for Realm
        const catalogsData = parseCatalogsForRealm(data);
        logPreparedData("Catalogs By Construction", catalogsData);

        // Store in Realm
        realm.write(() => {
          realm.create(
            "CatalogsByConstructionResponse",
            {
              _id: `${AVANCE_QUERY_KEYS.CATALOGS_BY_CONSTRUCTION}-${constructionId}`,
              catalogs: catalogsData,
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });

        logRealmStoreSuccess("Catalogs By Construction");

        // Verify the write
        const verification = realm.objectForPrimaryKey(
          "CatalogsByConstructionResponse",
          `${AVANCE_QUERY_KEYS.CATALOGS_BY_CONSTRUCTION}-${constructionId}`,
        );
        logRealmVerification(
          "Catalogs By Construction",
          !!verification,
          verification?.catalogs,
        );
      } catch (error) {
        logRealmStoreError("Catalogs By Construction", error, data);
        throw error;
      }

      return data;
    },
    enabled: !!constructionId && isOnline === true,
  });

export const useCatalogsByConstruction = (
  constructionId: number | undefined,
) => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();

  const cached = useObject(
    CatalogsByConstructionResponse,
    `${AVANCE_QUERY_KEYS.CATALOGS_BY_CONSTRUCTION}-${constructionId}`,
  );

  const q = useQuery(
    catalogsByConstructionOptions(constructionId, realm, isOnline),
  );

  logHookState("useCatalogsByConstruction", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: cached?.catalogs ? `${cached.catalogs.length} catalogs` : null,
    queryState: {
      isLoading: q.isLoading,
      isPending: q.isPending,
      isSuccess: q.isSuccess,
      isError: q.isError,
    },
  });

  if (!isOnline && cached) {
    logOfflineMode("Catalogs By Construction", cached);
  }

  return {
    ...q,
    data: cached?.catalogs ? Array.from(cached.catalogs) : [],
    hasOfflineData: !!cached,
    isInitialLoading: !cached && q.isPending,
  };
};

export const useCatalogsByConstructionFromRealm = (
  constructionId: number | undefined,
) =>
  useObject(
    CatalogsByConstructionResponse,
    `${AVANCE_QUERY_KEYS.CATALOGS_BY_CONSTRUCTION}-${constructionId}`,
  );

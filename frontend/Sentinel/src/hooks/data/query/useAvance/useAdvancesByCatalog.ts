import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getAdvancesByCatalog } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { AvancesByCatalogResponse } from "src/realm/avanceByCatalog/Response";
import { AVANCE_QUERY_KEYS } from "../avanceQueries.const";
import {
  parseAdvancesForRealm,
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

export const advancesByCatalogOptions = (
  {
    catalogId,
    detailed = true,
  }: {
    catalogId: number | undefined;
    detailed?: boolean;
  },
  realm: Realm,
  isOnline: boolean | null,
) =>
  queryOptions({
    queryKey: [AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG, catalogId, detailed],
    queryFn: async () => {
      logApiFetchStart("Advances By Catalog");
      const data = await getAdvancesByCatalog({
        catalogId: catalogId!,
        detailed,
      });

      logApiResponse("Advances By Catalog", data);

      if (!data) {
        logNoApiData("Advances By Catalog");
        return data;
      }

      logArrayLength("Advances", data.advances?.length || 0);

      logRealmStoreStart("Advances By Catalog");

      try {
        // Parse data for Realm
        const advancesData = parseAdvancesForRealm(data.advances);
        logPreparedData("Advances By Catalog", {
          advancesCount: advancesData.length,
          count: data.count,
        });

        // Store in Realm
        realm.write(() => {
          realm.create(
            "AvancesByCatalogResponse",
            {
              _id: `${AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG}-${catalogId}`,
              advances: advancesData,
              count: data.count,
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });

        logRealmStoreSuccess("Advances By Catalog");

        // Verify the write
        const verification: AvancesByCatalogResponse | null =
          realm.objectForPrimaryKey(
            "AvancesByCatalogResponse",
            `${AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG}-${catalogId}`,
          );
        logRealmVerification("Advances By Catalog", !!verification, {
          advancesCount: verification?.advances?.length,
          count: verification?.count,
        });
      } catch (error) {
        logRealmStoreError("Advances By Catalog", error, data);
        throw error;
      }

      return data;
    },
    enabled: !!catalogId && isOnline === true,
  });

export const useAdvancesByCatalog = ({
  catalogId,
  detailed = true,
}: {
  catalogId: number | undefined;
  detailed?: boolean;
}) => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();

  const cached = useObject(
    AvancesByCatalogResponse,
    `${AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG}-${catalogId}`,
  );

  const q = useQuery(
    advancesByCatalogOptions(
      {
        catalogId,
        detailed,
      },
      realm,
      isOnline,
    ),
  );

  logHookState("useAdvancesByCatalog", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: cached
      ? {
          advancesCount: cached.advances?.length,
          count: cached.count,
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
    logOfflineMode("Advances By Catalog", cached);
  }

  return {
    ...q,
    data: cached ?? null,
    hasOfflineData: !!cached,
    isInitialLoading: !cached && q.isPending,
  };
};

export const useAdvancesByCatalogFromRealm = (catalogId: number | undefined) =>
  useObject(
    AvancesByCatalogResponse,
    `${AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG}-${catalogId}`,
  );

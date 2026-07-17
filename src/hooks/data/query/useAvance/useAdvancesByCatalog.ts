import { useMemo } from "react";
import { queryOptions, useQueries } from "@tanstack/react-query";
import { useObject, useQuery as useRealmQuery, useRealm } from "@realm/react";
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
        // Realm cerrado en pleno vuelo: devolver los datos de la API sin
        // cachear (patrón de useHubDiario); el siguiente refetch cachea
        return data;
      }

      return data;
    },
    enabled: !!catalogId && isOnline === true,
  });

export const useAdvancesByCatalog = ({
  catalogIds,
  detailed = true,
}: {
  catalogIds: number[];
  detailed?: boolean;
}) => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();

  // Build the Realm primary keys for each catalog
  const realmIds = useMemo(
    () =>
      catalogIds.map((id) => `${AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG}-${id}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogIds.join(",")],
  );

  // Read all cached records for the given catalog IDs from Realm in one reactive query
  const cachedItems = useRealmQuery(
    AvancesByCatalogResponse,
    (objects) =>
      realmIds.length === 0
        ? objects.filtered("FALSEPREDICATE")
        : objects.filtered("_id IN $0", realmIds),
    [realmIds.join(",")],
  );

  // Merge advances from all cached Realm records into a single flat array
  const advances = useMemo(
    () =>
      Array.from(cachedItems).flatMap((item) =>
        Array.from(item.advances ?? []),
      ),
    [cachedItems],
  );

  // Run one TanStack query per catalog ID in parallel
  const queries = useQueries({
    queries: catalogIds.map((catalogId) =>
      advancesByCatalogOptions({ catalogId, detailed }, realm, isOnline),
    ),
  });

  const hasOfflineData = cachedItems.length > 0;
  const isLoading = queries.some((q) => q.isLoading);
  const isPending = queries.some((q) => q.isPending);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.error)?.error ?? null;

  logHookState("useAdvancesByCatalog", {
    isOnline,
    hasRealm: !!realm,
    hasCached: hasOfflineData,
    cachedData: {
      catalogCount: cachedItems.length,
      advancesCount: advances.length,
    },
    queryState: { isLoading, isPending, isError },
  });

  if (!isOnline && hasOfflineData) {
    logOfflineMode("Advances By Catalog (multi)", cachedItems);
  }

  return {
    advances,
    hasOfflineData,
    isLoading,
    isPending,
    isError,
    error,
    isInitialLoading: !hasOfflineData && isPending,
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  };
};

export const useAdvancesByCatalogFromRealm = (catalogId: number | undefined) =>
  useObject(
    AvancesByCatalogResponse,
    `${AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG}-${catalogId}`,
  );

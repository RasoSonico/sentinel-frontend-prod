import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getPartidasByCatalog } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { PartidasByCatalogResponse } from "src/realm/partidasByCatalog/Response";
import { AVANCE_QUERY_KEYS } from "../avanceQueries.const";
import {
  parsePartidasForRealm,
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

export const partidasByCatalogOptions = (
  catalogId: number | null,
  realm: Realm,
  isOnline: boolean | null,
) =>
  queryOptions({
    queryKey: [AVANCE_QUERY_KEYS.PARTIDAS_BY_CATALOG, catalogId],
    queryFn: async () => {
      logApiFetchStart("Partidas By Catalog");
      const data = await getPartidasByCatalog(catalogId!);

      logApiResponse("Partidas By Catalog", data);
      logArrayLength("Partidas", data?.length || 0);

      if (!data || data.length === 0) {
        logNoApiData("Partidas By Catalog");
        // Store empty array
        try {
          realm.write(() => {
            realm.create(
              "PartidasByCatalogResponse",
              {
                _id: `${AVANCE_QUERY_KEYS.PARTIDAS_BY_CATALOG}-${catalogId}`,
                partidas: [],
                updatedAt: new Date(),
              },
              UpdateMode.Modified,
            );
          });
          logRealmStoreSuccess("empty Partidas");
        } catch (error) {
          logRealmStoreError("empty Partidas", error);
        }
        return [];
      }

      logRealmStoreStart("Partidas By Catalog");

      try {
        // Parse data for Realm
        const partidasData = parsePartidasForRealm(data);
        logPreparedData("Partidas By Catalog", partidasData);

        // Store in Realm
        realm.write(() => {
          realm.create(
            "PartidasByCatalogResponse",
            {
              _id: `${AVANCE_QUERY_KEYS.PARTIDAS_BY_CATALOG}-${catalogId}`,
              partidas: partidasData,
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });

        logRealmStoreSuccess("Partidas By Catalog");

        // Verify the write
        const verification = realm.objectForPrimaryKey(
          "PartidasByCatalogResponse",
          `${AVANCE_QUERY_KEYS.PARTIDAS_BY_CATALOG}-${catalogId}`,
        );
        logRealmVerification(
          "Partidas By Catalog",
          !!verification,
          verification?.partidas,
        );
      } catch (error) {
        logRealmStoreError("Partidas By Catalog", error, data);
        // Realm cerrado en pleno vuelo: devolver los datos de la API sin
        // cachear (patrón de useHubDiario); el siguiente refetch cachea
        return data;
      }

      return data;
    },
    enabled: !!catalogId && isOnline === true,
  });

export const usePartidasByCatalog = (catalogId: number | null) => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();

  const cached = useObject(
    PartidasByCatalogResponse,
    `${AVANCE_QUERY_KEYS.PARTIDAS_BY_CATALOG}-${catalogId}`,
  );

  const q = useQuery(partidasByCatalogOptions(catalogId, realm, isOnline));

  logHookState("usePartidasByCatalog", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: cached?.partidas ? `${cached.partidas.length} partidas` : null,
    queryState: {
      isLoading: q.isLoading,
      isPending: q.isPending,
      isSuccess: q.isSuccess,
      isError: q.isError,
    },
  });

  if (!isOnline && cached) {
    logOfflineMode("Partidas By Catalog", cached);
  }

  return {
    ...q,
    data: cached?.partidas ? Array.from(cached.partidas) : [],
    hasOfflineData: !!cached,
    isInitialLoading: !cached && q.isPending,
  };
};

export const usePartidasByCatalogFromRealm = (catalogId: number | null) =>
  useObject(
    PartidasByCatalogResponse,
    `${AVANCE_QUERY_KEYS.PARTIDAS_BY_CATALOG}-${catalogId}`,
  );

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getTiposMaquinaria } from "../../api/maquinariaApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { TiposMaquinariaResponse } from "src/realm/tiposMaquinaria/Response";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";
import {
  logApiFetchStart,
  logApiResponse,
  logNoApiData,
  logRealmStoreStart,
  logRealmStoreSuccess,
  logRealmStoreError,
  logHookState,
  logOfflineMode,
  logArrayLength,
} from "../useAvance/utils";

const TIPOS_REALM_KEY = MAQUINARIA_QUERY_KEYS.TIPOS;

export const tiposMaquinariaOptions = (
  realm: Realm,
  isOnline: boolean | null,
) =>
  queryOptions({
    queryKey: [MAQUINARIA_QUERY_KEYS.TIPOS],
    enabled: isOnline === true,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      logApiFetchStart("Tipos Maquinaria");
      const data = await getTiposMaquinaria();

      logApiResponse("Tipos Maquinaria", data);
      logArrayLength("Tipos", data?.length ?? 0);

      if (!data || data.length === 0) {
        logNoApiData("Tipos Maquinaria");
        return [];
      }

      logRealmStoreStart("Tipos Maquinaria");

      try {
        realm.write(() => {
          realm.create(
            "TiposMaquinariaResponse",
            {
              _id: TIPOS_REALM_KEY,
              tipos: data.map((t) => ({
                id: t.id,
                nombre: t.nombre,
                is_active: t.is_active,
              })),
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });

        logRealmStoreSuccess("Tipos Maquinaria");
      } catch (error) {
        logRealmStoreError("Tipos Maquinaria", error, data);
        return data;
      }

      return data;
    },
  });

export const useTiposMaquinaria = () => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();

  const cached = useObject(TiposMaquinariaResponse, TIPOS_REALM_KEY);

  const q = useQuery(tiposMaquinariaOptions(realm, isOnline));

  logHookState("useTiposMaquinaria", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: cached ? `${cached.tipos.length} tipos` : null,
  });

  if (!isOnline && cached) {
    logOfflineMode("Tipos Maquinaria", cached);
  }

  return {
    ...q,
    data: cached?.tipos ? Array.from(cached.tipos) : [],
    hasOfflineData: !!cached,
    isInitialLoading: !cached && q.isPending,
  };
};

export const useTiposMaquinariaFromRealm = () =>
  useObject(TiposMaquinariaResponse, TIPOS_REALM_KEY);

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getHubDiario } from "../../api/maquinariaApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { MaquinariaHubResponse } from "src/realm/maquinariaHub/Response";
import { MaquinariaHubItem } from "src/types/maquinaria";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";
import { DateUtils } from "src/utils/dateUtils";
import {
  logApiFetchStart,
  logApiResponse,
  logNoApiData,
  logRealmStoreStart,
  logRealmStoreSuccess,
  logRealmStoreError,
  logRealmVerification,
  logHookState,
  logOfflineMode,
  logArrayLength,
} from "../useAvance/utils";

const realmKey = (constructionId: number, localDate: string) =>
  `${MAQUINARIA_QUERY_KEYS.HUB_DIARIO}-${constructionId}-${localDate}`;

const flattenHubItem = (item: MaquinariaHubItem) => ({
  id: item.id,
  tipo: item.tipo,
  marca: item.marca,
  modelo: item.modelo ?? "",
  propietario_tipo: item.propietario_tipo,
  tipo_permanencia: item.tipo_permanencia,
  estancia_id: item.estancia_actual.id,
  estancia_fecha_ingreso: item.estancia_actual.fecha_ingreso,
  jornada_id: item.jornada_hoy?.id ?? null,
  jornada_estado: item.jornada_hoy?.estado ?? null,
  jornada_catalog: item.jornada_hoy?.catalog ?? null,
  jornada_concept: item.jornada_hoy?.concept ?? null,
  jornada_motivo_inactividad: item.jornada_hoy?.motivo_inactividad ?? null,
  jornada_observaciones: item.jornada_hoy?.observaciones ?? null,
  requiere_reconciliacion: item.requiere_reconciliacion,
  dias_sin_reporte: item.dias_sin_reporte,
  ultima_jornada_fecha: item.ultima_jornada_fecha ?? null,
});

export const hubDiarioOptions = (
  constructionId: number | undefined,
  realm: Realm,
  isOnline: boolean | null,
  localDate: string,
) =>
  queryOptions({
    queryKey: [MAQUINARIA_QUERY_KEYS.HUB_DIARIO, constructionId, localDate],
    enabled: !!constructionId && isOnline === true,
    queryFn: async () => {
      logApiFetchStart("Hub Diario Maquinaria");
      const data = await getHubDiario(constructionId!, localDate);

      logApiResponse("Hub Diario", data);
      logArrayLength("Maquinarias en sitio", data?.maquinarias?.length ?? 0);

      if (!data) {
        logNoApiData("Hub Diario");
        return null;
      }

      logRealmStoreStart("Hub Diario");

      try {
        const flatItems = (data.maquinarias ?? []).map(flattenHubItem);

        realm.write(() => {
          realm.create(
            "MaquinariaHubResponse",
            {
              _id: realmKey(constructionId!, localDate),
              fecha: data.fecha,
              total_en_sitio: data.resumen.total_en_sitio,
              reportadas_hoy: data.resumen.reportadas_hoy,
              sin_reportar: data.resumen.sin_reportar,
              sin_operar: data.resumen.sin_operar,
              maquinarias: flatItems,
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });

        logRealmStoreSuccess("Hub Diario");

        const verification = realm.objectForPrimaryKey(
          "MaquinariaHubResponse",
          realmKey(constructionId!, localDate),
        );
        logRealmVerification("Hub Diario", !!verification);
      } catch (error) {
        logRealmStoreError("Hub Diario", error, data);
        // Realm closed mid-flight (e.g. schema migration); return API data without caching
        return data;
      }

      return data;
    },
  });

export const useHubDiario = (constructionId: number | undefined) => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();
  const localDate = DateUtils.localDateToUTC(new Date());

  const cached = useObject(
    MaquinariaHubResponse,
    constructionId ? realmKey(constructionId, localDate) : "",
  );

  const q = useQuery(
    hubDiarioOptions(constructionId, realm, isOnline, localDate),
  );

  logHookState("useHubDiario", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: cached ? `${cached.maquinarias.length} máquinas` : null,
    queryState: {
      isLoading: q.isLoading,
      isPending: q.isPending,
      isSuccess: q.isSuccess,
      isError: q.isError,
    },
  });

  if (!isOnline && cached) {
    logOfflineMode("Hub Diario", cached);
  }

  return {
    ...q,
    data: cached ?? null,
    hasOfflineData: !!cached,
    isInitialLoading: !cached && q.isPending,
  };
};

export const useHubDiarioFromRealm = (constructionId: number | undefined) => {
  const localDate = DateUtils.localDateToUTC(new Date());
  return useObject(
    MaquinariaHubResponse,
    constructionId ? realmKey(constructionId, localDate) : "",
  );
};

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getHubDiario } from "../../api/maquinariaApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { MaquinariaHubResponse } from "src/realm/maquinariaHub/Response";
import { MaquinariaHubItem } from "src/types/maquinaria";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";
import { DateUtils } from "src/utils/dateUtils";
import { useFechaOperativa } from "src/hooks/utils/useFechaOperativa";
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

/**
 * Del JSON a la forma de Realm.
 *
 * Casi sin traducir: los nombres del esquema local son los del servidor
 * justamente para que este paso no convierta nada. Traducir aquí es donde se
 * cuela un tipo que no es el que Realm declara, y una escritura rechazada
 * deja la pantalla con datos viejos sin decir nada.
 */
const flattenHubItem = (item: MaquinariaHubItem) => ({
  id: item.id,
  tipo: item.tipo,
  marca: item.marca,
  modelo: item.modelo ?? "",
  propietario_tipo: item.propietario_tipo,
  tipo_permanencia: item.tipo_permanencia,
  estancia_id: item.estancia_actual.id,
  estancia_fecha_ingreso: item.estancia_actual.fecha_ingreso,
  estado_dia: item.estado_dia,
  actividades_hoy: item.actividades_hoy,
  falta_horometro: item.falta_horometro,
  jornada_hoy: item.jornada_hoy ?? null,
  turno_abierto: item.turno_abierto ?? null,
  jornada_turno_abierto: item.jornada_turno_abierto ?? null,
  requiere_atencion: item.requiere_atencion?.motivo ?? null,
  dias_sin_reporte: item.dias_sin_reporte,
  ultima_jornada_fecha: item.ultima_jornada_fecha ?? null,
  ultimo_horometro: item.ultimo_horometro ?? null,
  ultimo_horometro_fecha: item.ultimo_horometro_fecha ?? null,
  ultima_jornada_trabajada_fecha: item.ultima_jornada_trabajada?.fecha ?? null,
  ultima_jornada_trabajada_detalles:
    item.ultima_jornada_trabajada?.detalles ?? [],
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
  // El día OPERATIVO, que cambia solo a medianoche y al volver a primer
  // plano. Calcularlo en cada render dejaba la pantalla —y la llave de la
  // query, así que también el refetch— en el día anterior si la app seguía
  // abierta al cruzar la medianoche o volvía del segundo plano sin pintar.
  const localDate = useFechaOperativa();

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

/**
 * El hub cacheado, sin pedir nada por red.
 *
 * `fecha` por default es hoy, que es el caso de la tab de Maquinaria. Se puede
 * pasar otra porque el caché está guardado POR DÍA: la previsualización de un
 * reporte que lleva días en la cola tiene que leer el día de ESE reporte, no
 * el de hoy. Si no hay caché de ese día, devuelve `null` — que es la verdad:
 * no se sabe, no que no hubiera maquinaria.
 */
export const useHubDiarioFromRealm = (
  constructionId: number | undefined,
  fecha?: string,
) => {
  const localDate = fecha ?? DateUtils.localDateToUTC(new Date());
  return useObject(
    MaquinariaHubResponse,
    constructionId ? realmKey(constructionId, localDate) : "",
  );
};

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getConstructionSummary } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { AVANCE_QUERY_KEYS } from "../avanceQueries.const";

/**
 * Agregado global de avance físico de la obra (ADR-002 backend):
 * { pct_fisico, importe_ejecutado, importe_contratado }.
 *
 * Solo online (sin cache Realm): la franja Hoy oculta la línea de obra
 * cuando no hay dato — fallback previsto por el ADR-003.
 */
export const useConstructionSummary = (constructionId: number | undefined) => {
  const isOnline = useNetworkStatus();

  return useQuery({
    queryKey: [AVANCE_QUERY_KEYS.CONSTRUCTION_SUMMARY, constructionId],
    queryFn: () => getConstructionSummary(constructionId!),
    enabled: !!constructionId && isOnline === true,
    staleTime: 5 * 60 * 1000,
    // 404 = obra ya no asignada (p. ej. id cacheado tras un cambio de
    // asignación): reintentar no lo arregla; el refetch de my_constructions
    // trae el id vigente y esta query se re-crea con la key nueva
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
};

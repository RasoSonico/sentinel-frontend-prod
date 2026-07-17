import { useQuery } from "@tanstack/react-query";
import { addDays, format, subDays } from "date-fns";
import { getPhotosByRange } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { AVANCE_QUERY_KEYS } from "../avanceQueries.const";

/**
 * Fotos de la obra alrededor del día local actual (galería FotosDelDiaSheet).
 *
 * El backend trunca uploaded_at a fecha UTC, así que se pide un rango de
 * ±1 día y el consumidor afina "hoy" haciendo join contra los avances del
 * día (misma definición de hoy que el contador de la franja). Solo online.
 */
export const useTodayPhotos = (constructionId: number | undefined) => {
  const isOnline = useNetworkStatus();
  const now = new Date();
  // La fecha local en la key invalida el cache al cambiar de día
  const localDate = format(now, "yyyy-MM-dd");

  return useQuery({
    queryKey: [AVANCE_QUERY_KEYS.PHOTOS_BY_DAY, constructionId, localDate],
    queryFn: () =>
      getPhotosByRange({
        constructionId: constructionId!,
        dateFrom: format(subDays(now, 1), "yyyy-MM-dd"),
        dateTo: format(addDays(now, 1), "yyyy-MM-dd"),
      }),
    enabled: !!constructionId && isOnline === true,
    staleTime: 2 * 60 * 1000,
  });
};

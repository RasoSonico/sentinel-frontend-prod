import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, subDays } from "date-fns";
import { getPhotosByRange } from "../../api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { ConstructionPhoto } from "src/types/avance";
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
  const queryClient = useQueryClient();
  const now = new Date();
  // La fecha local en la key invalida el cache al cambiar de día
  const localDate = format(now, "yyyy-MM-dd");
  const queryKey = [AVANCE_QUERY_KEYS.PHOTOS_BY_DAY, constructionId, localDate];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const fresh = await getPhotosByRange({
        constructionId: constructionId!,
        dateFrom: format(subDays(now, 1), "yyyy-MM-dd"),
        dateTo: format(addDays(now, 1), "yyyy-MM-dd"),
      });

      // Estabilizar la URL del thumbnail por id de foto: el token SAS viaja
      // en la URL y cambia en cada respuesta, así que el cache de imágenes
      // del dispositivo la trataría como imagen nueva y re-descargaría todo.
      // Conservando la primera URL vista (SAS de 24 h; la key es del día
      // local) el cache acierta y se eliminan descargas repetidas.
      const previous =
        queryClient.getQueryData<ConstructionPhoto[]>(queryKey);
      if (!previous) return fresh;
      const previousById = new Map(previous.map((p) => [p.id, p]));
      return fresh.map((photo) => {
        const prev = previousById.get(photo.id);
        return prev?.thumbnail_url
          ? { ...photo, thumbnail_url: prev.thumbnail_url }
          : photo;
      });
    },
    enabled: !!constructionId && isOnline === true,
    staleTime: 2 * 60 * 1000,
  });
};

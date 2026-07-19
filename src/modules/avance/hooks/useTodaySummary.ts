import { format, subDays } from "date-fns";
import {
  useAdvancesByCatalog,
  useAssignedConstruction,
  useAvanceBase,
  useConstructionSummary,
} from "src/hooks/data/query/useAvance";
import { useIncidentsQuery } from "src/hooks/data/query/useIncidenciaQueries";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { usePendingPhotoQueue } from "src/hooks/avance/usePendingPhotoQueue";
import { DateUtils } from "src/utils/dateUtils";

export interface TodayObraResumen {
  pct: number;
  ejecutado: number;
  contratado: number;
}

export interface TodayCounts {
  avances: number;
  fotos: number;
  /** null = sin dato (las incidencias no tienen cola offline) */
  incidencias: number | null;
}

export interface UseTodaySummaryResult {
  constructionId: number | null;
  obraNombre: string | null;
  /** null mientras el agregado de backend no responde (fallback del ADR) */
  resumenObra: TodayObraResumen | null;
  counts: TodayCounts;
}

const isTodayLocal = (d: Date | null | undefined): boolean => {
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

/**
 * Datos de la franja "Hoy" del home (ADR-003 D2).
 *
 * Contadores = servidor + cola offline Realm: el contratista que captura sin
 * señal ve su día completo. El worker elimina el item de la cola ANTES de
 * invalidar la lista del servidor, así que no hay doble conteo en el flujo
 * feliz; las ventanas residuales se autocorrigen con el refetch.
 */
export function useTodaySummary(): UseTodaySummaryResult {
  const { data: construction } = useAssignedConstruction();
  const constructionId = construction ? Number(construction.id) : null;

  // Catálogos desde el cache offline de avance/base (misma fuente que la sábana)
  const { data: avanceBase } = useAvanceBase();
  const catalogIds = avanceBase?.catalogs
    ? Array.from(avanceBase.catalogs).map((c) => c.id)
    : [];

  const { advances } = useAdvancesByCatalog({ catalogIds, detailed: true });

  const todayRange = DateUtils.getTodayUTCRange();
  const todaysSynced = advances.filter((a) =>
    DateUtils.isDateInUTCRange(a.date, todayRange.start, todayRange.end),
  );

  // Capturas de hoy aún en cola (pending + syncing + failed: existen y cuentan)
  const { pendingItems, syncingItems, failedItems } = usePendingAdvanceQueue();
  const queuedTodayCount = [
    ...pendingItems,
    ...syncingItems,
    ...failedItems,
  ].filter((item) => isTodayLocal(item.createdAt)).length;

  // Fotos: por avance, máx(photo_count del servidor, fotos en cola) — la
  // cola (incluyendo "done": subidas cuyo photo_count aún no refresca) cubre
  // el desfase de subida y el máximo absorbe el traslape, así el contador no
  // puede contar de menos ni de más durante la sincronización.
  const {
    pendingPhotos,
    waitingPhotos,
    syncingPhotos,
    failedPhotos,
    donePhotos,
  } = usePendingPhotoQueue();
  const queuePhotosToday = [
    ...pendingPhotos,
    ...waitingPhotos,
    ...syncingPhotos,
    ...failedPhotos,
    ...donePhotos,
  ].filter((photo) => isTodayLocal(photo.createdAt));

  // Agrupar la cola por avance del servidor; las fotos cuyo avance aún no
  // aparece en el cache (o no ha sincronizado) se cuentan directo
  const queueBySyncedAdvance = new Map<number, number>();
  let unlinkedQueuePhotosCount = 0;
  for (const photo of queuePhotosToday) {
    const remoteId = photo.physicalAdvanceId;
    if (
      remoteId != null &&
      todaysSynced.some((a) => a.id === remoteId)
    ) {
      queueBySyncedAdvance.set(
        remoteId,
        (queueBySyncedAdvance.get(remoteId) ?? 0) + 1,
      );
    } else {
      unlinkedQueuePhotosCount++;
    }
  }

  const fotosHoyCount =
    todaysSynced.reduce(
      (acc, a) =>
        acc +
        Math.max(a.photo_count ?? 0, queueBySyncedAdvance.get(a.id) ?? 0),
      0,
    ) + unlinkedQueuePhotosCount;

  // Incidencias: solo servidor. El backend filtra date_after como fecha UTC,
  // así que se pide una ventana holgada y se afina con el rango local de hoy
  const incidentsQuery = useIncidentsQuery({
    date_after: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    page_size: 100,
    ordering: "-date",
  });
  const incidenciasHoy = incidentsQuery.data?.incidents
    ? incidentsQuery.data.incidents.filter((i) =>
        DateUtils.isDateInUTCRange(i.date, todayRange.start, todayRange.end),
      ).length
    : null;

  // Agregado global de obra (ADR-002 backend); null offline o sin respuesta
  const summaryQuery = useConstructionSummary(constructionId ?? undefined);
  let resumenObra: TodayObraResumen | null = null;
  if (summaryQuery.data) {
    const ejecutado = parseFloat(summaryQuery.data.importe_ejecutado);
    const contratado = parseFloat(summaryQuery.data.importe_contratado);
    resumenObra = {
      pct: Math.max(0, summaryQuery.data.pct_fisico),
      ejecutado: isNaN(ejecutado) ? 0 : ejecutado,
      contratado: isNaN(contratado) ? 0 : contratado,
    };
  }

  return {
    constructionId,
    obraNombre: construction?.name ?? null,
    resumenObra,
    counts: {
      avances: todaysSynced.length + queuedTodayCount,
      fotos: fotosHoyCount,
      incidencias: incidenciasHoy,
    },
  };
}

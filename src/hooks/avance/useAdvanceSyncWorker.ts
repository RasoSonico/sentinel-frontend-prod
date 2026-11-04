import { useEffect, useRef, useCallback, useState } from "react";
import { telemetry } from "src/services/telemetry";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePendingAdvanceQueue } from "./usePendingAdvanceQueue";
import { usePendingPhotoQueue } from "./usePendingPhotoQueue";
import { useNetworkStatus } from "../utils/useNetworkStatus";
import { useAppSelector } from "src/redux/hooks";
import { useSnackbar } from "../useSnackbar";
import { submitAdvance } from "../data/api/avanceApi";
import { AVANCE_QUERY_KEYS } from "../data/query/avanceQueries.const";
import { PendingAdvanceSubmission } from "src/realm/pendingAdvance/PendingAdvanceSubmission";
import { ApiError } from "src/services/api/apiClient";

/**
 * El presupuesto de reintentos se mide en TIEMPO, no en intentos (F50).
 *
 * Mismo arreglo que en reportes, maquinaria y las fotos de avances.
 */
const ESPERA_BASE_MS = 5_000;
const ESPERA_MAXIMA_MS = 5 * 60 * 1000;

/**
 * Un 4xx no se arregla reintentando: el servidor entendió y rechazó. Un 5xx,
 * un plazo vencido o un corte, sí. 408 y 429 son 4xx que piden volver.
 */
const esPermanente = (status: number | undefined): boolean =>
  status !== undefined &&
  status >= 400 &&
  status < 500 &&
  status !== 408 &&
  status !== 429;

const DEBOUNCE_MS = 500;

export function useAdvanceSyncWorker() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const isOnline = useNetworkStatus();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const {
    pendingItems,
    pendingCount,
    markAsSyncing,
    aplazar,
    markAsFailed,
    markAsPending,
    completeAdvanceSyncAtomic,
    resetStuckSyncingItems,
    getItemById,
  } = usePendingAdvanceQueue();

  const { getPhotosByAdvanceId } = usePendingPhotoQueue();

  const [isSyncing, setIsSyncing] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const syncInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * Reprograma el ciclo. Es ESTADO y no un ref: un ref no provoca render, así
   * que el disparador no volvería a correr y el reintento no llegaría nunca.
   */
  const [pulso, setPulso] = useState(0);

  /** Espera actual del respaldo y el instante en que vence. */
  const esperaRef = useRef(0);
  const finDeEsperaRef = useRef(0);
  const reintentoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Programa el siguiente intento, duplicando la espera (F50).
   *
   * Vive FUERA del ciclo: antes cada fallo dormía dentro del lazo, con un
   * `await` entre dos avances, y el ciclo entero quedaba detenido.
   *
   * También evita el giro en vacío: `aplazar` escribe en Realm, la consulta
   * viva cambia y el disparador volvería a correr de inmediato.
   */
  const programarReintento = useCallback(() => {
    esperaRef.current = Math.min(
      esperaRef.current === 0 ? ESPERA_BASE_MS : esperaRef.current * 2,
      ESPERA_MAXIMA_MS,
    );
    finDeEsperaRef.current = Date.now() + esperaRef.current;
    if (reintentoRef.current) clearTimeout(reintentoRef.current);
    reintentoRef.current = setTimeout(() => {
      finDeEsperaRef.current = 0;
      if (mountedRef.current) setPulso((p) => p + 1);
    }, esperaRef.current);
  }, []);

  /** Borra la espera: lo que la motivaba ya cambió. */
  const reiniciarEspera = useCallback(() => {
    esperaRef.current = 0;
    finDeEsperaRef.current = 0;
    if (reintentoRef.current) {
      clearTimeout(reintentoRef.current);
      reintentoRef.current = null;
    }
  }, []);

  // Mutation for submitting advance
  const submitMutation = useMutation({
    mutationFn: async (item: PendingAdvanceSubmission) => {
      return await submitAdvance({
        concept: item.conceptId,
        volume: Number(item.volume),
        comments: item.comments,
        // Idempotencia: si la respuesta se pierde y reintentamos, el backend
        // responde el avance ya creado en lugar de duplicarlo (ADR-002)
        client_id: item._id,
      });
    },
  });

  // Reset stuck items on mount
  useEffect(() => {
    const resetCount = resetStuckSyncingItems();
    if (resetCount > 0) {
      console.log(`[SyncWorker] Reset ${resetCount} stuck syncing items`);
    }
  }, [resetStuckSyncingItems]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Process the sync queue
   */
  const processQueue = useCallback(async () => {
    // Guard against concurrent processing or unauthenticated state
    /**
     * `isOnline === false` y no `!isOnline`: `null` significa "todavía no se
     * sabe", y tratarlo como "sin red" deja la cola trabada justo cuando la
     * sonda no logra decidir — que en obra es el caso común, no el raro.
     */
    if (
      syncInProgressRef.current ||
      isOnline === false ||
      !isAuthenticated ||
      pendingCount === 0
    ) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    let successCount = 0;
    let failCount = 0;

    try {
      // Get a snapshot of pending items to process
      const itemsToProcess = [...pendingItems];

      for (const item of itemsToProcess) {
        // Sin releer `isOnline`: el ciclo lo capturó al crearse y no cambia a
        // media vuelta. Un corte real lo detecta el intento, que falla y se
        // aplaza.
        if (!mountedRef.current) {
          break;
        }

        setCurrentItemId(item._id);

        // Mark as syncing
        markAsSyncing(item._id);

        try {
          // Attempt to submit
          const response = await submitMutation.mutateAsync(item);

          // Get the physical_advance_id from the API response
          const physicalAdvanceId = response.id;

          // Check if there are photos for this advance
          const advancePhotos = getPhotosByAdvanceId(item._id);
          const hasPhotos = advancePhotos.length > 0;

          // ATOMIC: Complete the sync in a single Realm transaction
          // This ensures crash safety - either all operations complete or none do:
          // 1. Update photos with physicalAdvanceId
          // 2. Mark photos as "waiting"
          // 3. Remove advance from queue
          const atomicSuccess = completeAdvanceSyncAtomic(
            item._id,
            physicalAdvanceId,
          );

          if (!atomicSuccess) {
            console.error(
              `[SyncWorker] Failed to atomically complete sync for advance ${item._id}`,
            );
            markAsFailed(
              item._id,
              "Error al completar la sincronización local",
            );
            failCount++;
            continue;
          }

          telemetry.trackEvent("advance_submitted", {
            obra_id: item.constructionId,
            catalog_id: item.catalogId,
            has_photos: hasPhotos,
            photo_count: advancePhotos.length,
            was_offline: true,
          });

          successCount++;

          // Show individual success notification
          const photoText = hasPhotos ? " (fotos en cola)" : "";
          showSnackbar(
            `Avance enviado: ${item.conceptDescription.substring(0, 30)}${item.conceptDescription.length > 30 ? "..." : ""}${photoText}`,
            "success",
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Error desconocido al sincronizar";

          /**
           * **Dos desenlaces, no tres (F50).**
           *
           * El servidor rechazó —y el avance se detiene a esperar a una
           * persona— o cualquier otra cosa, y vuelve a la fila.
           *
           * La rama de "reintentar" de antes decía en su comentario que
           * devolvía el avance a `pending` y **no lo hacía**: llamaba a
           * `markAsFailed` y ahí terminaba. Como el worker solo lee `pending`,
           * un avance capturado sin señal moría al PRIMER intento, mucho antes
           * de llegar al techo de tres.
           */
          const status =
            error instanceof ApiError ? error.status : undefined;

          if (esPermanente(status)) {
            markAsFailed(
              item._id,
              `El servidor rechazó el avance (${status}). ${errorMessage}`.trim(),
            );
            failCount++;

            showSnackbar(
              `Error al enviar avance: ${item.conceptDescription.substring(0, 20)}...`,
              "error",
              {
                label: "Ver detalles",
                onPress: () => {
                  // This will be handled by the UI to open the sync sheet
                  console.log("[SyncWorker] User wants to see error details");
                },
              },
            );
          } else {
            // Sin dormir aquí: el espaciado lo pone el ciclo. Dormir dentro
            // del lazo detenía de paso los avances de los demás.
            aplazar(item._id, errorMessage);
            failCount++;
          }
        }
      }

      // Invalidate queries to refresh list after successful syncs
      if (successCount > 0) {
        await queryClient.invalidateQueries({
          queryKey: [AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG],
        });
        // El agregado de obra se recalcula en el servidor en cada GET, pero
        // NADIE lo invalidaba: capturar un avance no movía el AVANCE% de la
        // franja, y solo se corregía de rebote (reconexión, login o
        // pull-to-refresh). Brecha de Fase 1, no del programa.
        await queryClient.invalidateQueries({
          queryKey: [AVANCE_QUERY_KEYS.CONSTRUCTION_SUMMARY],
        });
      }

      // Show batch completion message if multiple items processed
      if (successCount + failCount > 1) {
        if (failCount === 0) {
          showSnackbar(
            `${successCount} avances sincronizados correctamente`,
            "success",
          );
        } else if (successCount === 0) {
          showSnackbar(`${failCount} avances fallaron al sincronizar`, "error");
        } else {
          showSnackbar(
            `${successCount} sincronizados, ${failCount} fallidos`,
            "info",
          );
        }
      }
      if (successCount + failCount > 0) {
        telemetry.trackEvent("sync_completed", {
          advances_synced: successCount,
          photos_synced: 0,
          failures: failCount,
        });
      }
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
      setCurrentItemId(null);

      if (successCount > 0) {
        // Algo avanzó: la red sirve y la espera acumulada ya no describe nada.
        reiniciarEspera();
        if (mountedRef.current) setPulso((p) => p + 1);
      } else if (failCount > 0) {
        // Nada salió y algo lo intentó: se vuelve, más tarde cada vez.
        programarReintento();
      }
    }
  }, [
    isOnline,
    isAuthenticated,
    pendingCount,
    pendingItems,
    markAsSyncing,
    aplazar,
    markAsFailed,
    completeAdvanceSyncAtomic,
    submitMutation,
    queryClient,
    showSnackbar,
    getPhotosByAdvanceId,
    programarReintento,
    reiniciarEspera,
  ]);

  /**
   * Volver a tener red borra la espera.
   *
   * Declarado ANTES del disparador: los efectos corren en orden de
   * declaración, así que para cuando el de abajo mira la ventana, esta ya está
   * limpia y el intento sale al llegar a la zona con señal, no cinco minutos
   * después.
   */
  useEffect(() => {
    if (isOnline === true) reiniciarEspera();
  }, [isOnline, reiniciarEspera]);

  // Debounced effect to trigger sync when conditions are met
  useEffect(() => {
    if (
      isOnline === false ||
      !isAuthenticated ||
      pendingCount === 0 ||
      syncInProgressRef.current
    ) {
      return;
    }
    // Dentro de la ventana de espera no se insiste: el temporizador del
    // respaldo despertará al ciclo cuando toque.
    if (Date.now() < finDeEsperaRef.current) return;

    // Debounce to avoid rapid re-triggers
    const timeoutId = setTimeout(() => {
      processQueue();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [isOnline, isAuthenticated, pendingCount, pulso, processQueue]);

  // Show notification when connection is restored
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current && pendingCount > 0) {
      showSnackbar(
        `Conexión restaurada. Sincronizando ${pendingCount} avance${pendingCount > 1 ? "s" : ""}...`,
        "info",
      );
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, pendingCount, showSnackbar]);

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    if (isOnline === false) {
      showSnackbar("Sin conexión a internet", "error");
      return;
    }
    // Una persona que toca el botón está diciendo "ahora".
    reiniciarEspera();
    await processQueue();
  }, [isOnline, processQueue, showSnackbar, reiniciarEspera]);

  /**
   * Retry a specific failed item
   */
  const retryItem = useCallback(
    async (id: string) => {
      const item = getItemById(id);

      if (!item || item.status !== "failed") {
        return;
      }

      markAsPending(id);

      // Process queue will pick it up
      if (isOnline) {
        await processQueue();
      }
    },
    [isOnline, processQueue, getItemById, markAsPending],
  );

  return {
    isSyncing,
    currentItemId,
    syncNow,
    retryItem,
  };
}

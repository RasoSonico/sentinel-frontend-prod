import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { telemetry } from "src/services/telemetry";
import {
  uploadToAzureBlob,
  uriToBlob,
} from "src/services/api/photoService";
import {
  confirmFotoUpload,
  requestFotoUpload,
  submitReporte,
} from "src/modules/reportes/services/reporteService";
import { REPORTE_QUERY_KEYS } from "../data/query/reporteQueries.const";
import { useNetworkStatus } from "../utils/useNetworkStatus";
import { useSnackbar } from "../useSnackbar";
import { useAppSelector } from "src/redux/hooks";
import { ApiError } from "src/services/api/apiClient";
import { PendingReporteSubmission } from "src/realm/pendingReporte/PendingReporteSubmission";
import type { ReportePayload } from "src/types/reporte";

import {
  usePendingReporteQueue,
  type ActividadEnCola,
} from "./usePendingReporteQueue";

const DEBOUNCE_MS = 500;
const RETRY_DELAY_BASE_MS = 1000;

interface FotoSerializada {
  orden: number;
  pie: string;
  filename: string;
  taken_at: string | null;
}

/**
 * Worker de sincronización del reporte de actividades (ADR-006, Decisión 7).
 *
 * Espejo de `useAdvanceSyncWorker` + `usePhotoSyncWorker`, en un solo worker
 * porque aquí las dos mitades son un mismo trámite encadenado:
 *
 *   POST del reporte → cierre atómico en Realm → SAS por foto → PUT a Blob →
 *   confirmación
 *
 * Reutiliza `uploadToAzureBlob()` **sin un solo cambio**; lo único que varía
 * respecto de avances es qué endpoint emite el SAS.
 *
 * Este worker es el único componente que sabe el instante en que el servidor
 * cambió —las pantallas escriben a la cola, no a la red—, así que también es
 * el único que puede invalidar las consultas que acaba de mover. El proyecto
 * tiene `refetchOnMount: false`: sin esta invalidación, la lista de la obra no
 * mostraría el reporte recién enviado hasta un pull-to-refresh.
 */
export function useReporteSyncWorker() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const isOnline = useNetworkStatus();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const {
    pendingCount,
    fotosListasParaSubir,
    markAsSyncing,
    markAsFailed,
    markAsPending,
    completeReporteSyncAtomic,
    resetStuckSyncingItems,
    resetStuckSyncingPhotos,
    setPhotoStatus,
    leerTrabajoPendiente,
    removeDonePhotos,
    removeDoneReportes,
    getItemById,
  } = usePendingReporteQueue();

  const [isSyncing, setIsSyncing] = useState(false);
  /**
   * Contador que solo existe para volver a disparar el efecto del ciclo cuando
   * un disparo se perdió por caer mientras había otro ciclo en curso.
   */
  const [pulso, setPulso] = useState(0);
  const enCursoRef = useRef(false);
  const montadoRef = useRef(true);

  // Rescate de arranque: lo que quedó en "syncing" de una sesión que murió a
  // media subida no lo va a mover nadie más.
  useEffect(() => {
    const reportes = resetStuckSyncingItems();
    const fotos = resetStuckSyncingPhotos();
    if (reportes || fotos) {
      console.log(
        `[ReporteSync] Rescatados ${reportes} reporte(s) y ${fotos} foto(s) encallados`,
      );
    }
  }, [resetStuckSyncingItems, resetStuckSyncingPhotos]);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  // ── Envío del reporte ───────────────────────────────────────────────────

  const enviarReporte = useCallback(
    async (item: PendingReporteSubmission): Promise<boolean> => {
      markAsSyncing(item._id);

      try {
        const detalle = await submitReporte({
          client_id: item._id,
          construction: item.constructionId,
          area: item.area as ReportePayload["area"],
          fecha_reporte: item.fechaReporte,
          conclusion: item.conclusion,
          actividades: JSON.parse(item.actividadesJson) as ActividadEnCola[],
          fotos: JSON.parse(item.fotosJson) as FotoSerializada[],
          proveedor_ids: JSON.parse(item.proveedorIdsJson) as number[],
        });

        const cerrado = completeReporteSyncAtomic(
          item._id,
          detalle.id,
          detalle.fotos ?? [],
        );
        if (!cerrado) {
          markAsFailed(item._id, "Error al cerrar el envío en el dispositivo");
          return false;
        }

        telemetry.trackEvent("reporte_actividades_saved", {
          obra_id: item.constructionId,
          actividades_count: item.actividadesCount,
          fotos_count: item.fotosCount,
          was_offline: true,
        });
        return true;
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;

        /**
         * Un 4xx NO se arregla reintentando: el servidor entendió la petición
         * y la rechazó, y el mismo cuerpo va a producir el mismo rechazo. Un
         * 5xx, un timeout o un corte sí — el servidor puede estar reiniciando
         * o a media migración. 408 y 429 son 4xx pero significan literalmente
         * "vuelve a intentar", así que cuentan como transitorios.
         *
         * Gastar los tres intentos en siete segundos contra un error temporal
         * convierte una falla pasajera en pérdida permanente, que es
         * exactamente lo que pasó con el 500 del despliegue.
         */
        const permanente =
          status !== undefined &&
          status >= 400 &&
          status < 500 &&
          status !== 408 &&
          status !== 429;

        const mensaje = permanente
          ? `El servidor rechazó el reporte (${status}). ${
              error instanceof Error ? error.message : ""
            }`.trim()
          : error instanceof Error
            ? error.message
            : "Error desconocido al enviar el reporte";

        markAsFailed(item._id, mensaje, permanente);

        // SIN el `+ 1` que tenía: `markAsFailed` ya incrementó `retryCount` y
        // `item` es un objeto VIVO de Realm, así que sumar otra vez contaba el
        // intento dos veces. El reporte se detenía en `retryCount = 2` con
        // `maxRetries = 3`, y como "agotado" se mide con `>= maxRetries`,
        // nunca llegaba a serlo: el chip decía "Reintentando" para siempre
        // sobre algo que ya no iba a reintentar nada.
        if (!permanente && item.retryCount < item.maxRetries) {
          const espera = RETRY_DELAY_BASE_MS * Math.pow(2, item.retryCount);
          await new Promise((resolve) => setTimeout(resolve, espera));
          markAsPending(item._id);
        }
        return false;
      }
    },
    [markAsSyncing, markAsFailed, markAsPending, completeReporteSyncAtomic],
  );

  // ── Subida de una foto ──────────────────────────────────────────────────

  const subirFoto = useCallback(
    async (foto: (typeof fotosListasParaSubir)[number]): Promise<boolean> => {
      if (foto.fotoRemotaId === null) return false;

      // `uploaded` significa que los bytes YA llegaron a Blob y solo falló la
      // confirmación: reintentar la subida gastaría red para nada.
      const soloConfirmar = foto.status === "uploaded";
      setPhotoStatus(foto._id, "syncing");

      try {
        if (!soloConfirmar) {
          // El SAS se pide AQUÍ, no en el 201 del reporte: caduca en dos horas
          // y un reintento tras una noche sin señal llegaría con un token
          // muerto. La ruta del blob, en cambio, ya está reservada y no caduca.
          const sas = await requestFotoUpload(foto.fotoRemotaId);
          const blob = await uriToBlob(foto.localUri);
          const resultado = await uploadToAzureBlob(
            sas.upload_url,
            blob,
            sas.instructions.headers["Content-Type"] ?? "image/jpeg",
          );

          if (!resultado.success) {
            setPhotoStatus(
              foto._id,
              "failed",
              resultado.errorMessage ?? "Error al subir la fotografía",
            );
            return false;
          }
          setPhotoStatus(foto._id, "uploaded");
        }

        await confirmFotoUpload(foto.fotoRemotaId, true);
        setPhotoStatus(foto._id, "done");
        return true;
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : "Error al subir la fotografía";
        // Si ya estaba subida se conserva `uploaded`, para que el reintento
        // solo confirme en vez de volver a mandar los bytes.
        setPhotoStatus(foto._id, soloConfirmar ? "uploaded" : "failed", mensaje);
        return false;
      }
    },
    [setPhotoStatus],
  );

  // ── Ciclo ───────────────────────────────────────────────────────────────

  const procesarCola = useCallback(async () => {
    // `isOnline === false` y no `!isOnline`: `null` significa "todavía no se
    // sabe", y tratarlo como "sin red" dejaba la cola trabada hasta que algo
    // externo moviera el estado. Ante la duda se intenta — un POST sin señal
    // falla y se reintenta, que es barato; no intentar nunca, no.
    if (enCursoRef.current || isOnline === false || !isAuthenticated) return;
    if (pendingCount === 0 && fotosListasParaSubir.length === 0) return;

    enCursoRef.current = true;
    setIsSyncing(true);

    let reportesEnviados = 0;
    let fotosSubidas = 0;
    let fallos = 0;

    try {
      for (const item of [...leerTrabajoPendiente().reportes]) {
        // Solo el montaje: `isOnline` es un valor capturado por el closure y no
        // cambia a media vuelta, así que revisarlo aquí nunca hizo nada. Si la
        // red se cae en medio, lo que corta es el fallo de la petición.
        if (!montadoRef.current) break;
        if (await enviarReporte(item)) reportesEnviados += 1;
        else fallos += 1;
      }

      // Se RELEEN de Realm, no se usa el snapshot del render que creó este
      // callback: las fotos del reporte que se acaba de enviar recién ahora
      // tienen `fotoRemotaId`, y en aquel snapshot todavía valían `null`, así
      // que el filtro las excluía. Iterar el snapshot recorría una lista vacía
      // y la foto se quedaba esperando un ciclo que no llegaba.
      for (const foto of leerTrabajoPendiente().fotos) {
        if (!montadoRef.current) break;
        if (await subirFoto(foto)) fotosSubidas += 1;
        else fallos += 1;
      }

      if (reportesEnviados > 0 || fotosSubidas > 0) {
        await queryClient.invalidateQueries({
          queryKey: [REPORTE_QUERY_KEYS.REPORTES_POR_OBRA],
        });
        await queryClient.invalidateQueries({
          queryKey: [REPORTE_QUERY_KEYS.REPORTE_DETALLE],
        });
        // Solo después de que la consulta refleje el estado nuevo: purgar
        // antes haría que la fila desapareciera de la lista y reapareciera con
        // el refetch (ciclo `done` de la enmienda E5 de la Fase 1).
        removeDonePhotos();
        removeDoneReportes();
      }

      if (reportesEnviados > 0) {
        showSnackbar(
          reportesEnviados === 1
            ? "Reporte enviado"
            : `${reportesEnviados} reportes enviados`,
          "success",
        );
      }
      if (reportesEnviados + fotosSubidas + fallos > 0) {
        telemetry.trackEvent("reporte_sync_completed", {
          reportes_synced: reportesEnviados,
          photos_synced: fotosSubidas,
          failures: fallos,
        });
      }
    } finally {
      enCursoRef.current = false;
      setIsSyncing(false);

      // El efecto que dispara el ciclo se sale si ya hay uno en curso, y
      // `enCursoRef` es un ref: al liberarse no provoca render, así que ese
      // disparo perdido nunca se recupera. Este pulso lo recupera.
      //
      // **Solo si el ciclo avanzó.** Si no se envió ni subió nada, reprogramar
      // sería girar en vacío contra un fallo que no se va a resolver solo; en
      // ese caso se espera a un disparo externo (red, reintento manual).
      if (reportesEnviados + fotosSubidas > 0) {
        const { reportes, fotos } = leerTrabajoPendiente();
        if (reportes.length > 0 || fotos.length > 0) {
          setPulso((n) => n + 1);
        }
      }
    }
  }, [
    isOnline,
    isAuthenticated,
    pendingCount,
    fotosListasParaSubir,
    leerTrabajoPendiente,
    enviarReporte,
    subirFoto,
    queryClient,
    removeDonePhotos,
    removeDoneReportes,
    showSnackbar,
  ]);

  useEffect(() => {
    if (isOnline === false || !isAuthenticated || enCursoRef.current) return;
    if (pendingCount === 0 && fotosListasParaSubir.length === 0) return;

    const timeoutId = setTimeout(procesarCola, DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [
    isOnline,
    isAuthenticated,
    pendingCount,
    fotosListasParaSubir.length,
    pulso,
    procesarCola,
  ]);

  const syncNow = useCallback(async () => {
    if (isOnline === false) {
      showSnackbar("Sin conexión a internet", "error");
      return;
    }
    await procesarCola();
  }, [isOnline, procesarCola, showSnackbar]);

  const retryItem = useCallback(
    async (id: string) => {
      const item = getItemById(id);
      if (!item || item.status !== "failed") return;
      markAsPending(id);
      if (isOnline !== false) await procesarCola();
    },
    [getItemById, markAsPending, isOnline, procesarCola],
  );

  return { isSyncing, syncNow, retryItem };
}

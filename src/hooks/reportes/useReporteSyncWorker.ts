import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { navigateReportes } from "src/navigation/NavigationService";
import { PendingReporteSubmission } from "src/realm/pendingReporte/PendingReporteSubmission";
import type { FirmaPayload, ReportePayload } from "src/types/reporte";

import {
  usePendingReporteQueue,
  type ActividadEnCola,
} from "./usePendingReporteQueue";

const DEBOUNCE_MS = 500;

/** Marca del rescate único de fotos detenidas. Ver el efecto que la usa. */
const MARCA_RESCATE = "reportes.rescate_fotos_detenidas.v1";

/**
 * Espera antes de volver a recorrer la cola cuando un ciclo entero no logró
 * mover nada. Se duplica en cada ciclo en vano hasta el tope.
 *
 * **El presupuesto de reintentos se mide en tiempo, no en intentos.** Tres
 * intentos quemados en siete segundos no significan nada en una obra: la señal
 * va y viene por zonas a lo largo del día, y lo único que separa un fallo de
 * un éxito suele ser esperar. El tope son cinco minutos; más que eso ya no es
 * reintentar, es rendirse despacio.
 */
const ESPERA_BASE_MS = 5_000;
const ESPERA_MAXIMA_MS = 5 * 60 * 1000;

/**
 * Qué errores no tiene caso reintentar.
 *
 * Un 4xx NO se arregla reintentando: el servidor entendió la petición y la
 * rechazó, y el mismo cuerpo va a producir el mismo rechazo. Un 5xx, un
 * timeout o un corte sí — el servidor puede estar reiniciando o a media
 * migración. 408 y 429 son 4xx pero significan literalmente "vuelve a
 * intentar", así que cuentan como transitorios.
 *
 * Gastar los intentos contra un error temporal convierte una falla pasajera en
 * pérdida permanente, que es exactamente lo que pasó con el 500 del
 * despliegue y lo que pasa todos los días con la señal de obra.
 */
const esPermanente = (error: unknown): boolean => {
  const status = error instanceof ApiError ? error.status : undefined;
  return (
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  );
};

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
    aplazarReporte,
    completeReporteSyncAtomic,
    resetStuckSyncingItems,
    resetStuckSyncingPhotos,
    setPhotoStatus,
    aplazarFoto,
    rescatarFotosDetenidas,
    leerTrabajoPendiente,
    leerReportesDisponibles,
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

  /** Cuánto se esperará antes del próximo ciclo. 0 = sin espera. */
  const esperaRef = useRef(0);
  /** Instante en que la espera vence. Antes de él, el efecto no dispara. */
  const finDeEsperaRef = useRef(0);
  const reintentoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Programa el próximo recorrido de la cola, con espera creciente.
   *
   * **Esto es lo que hace que la cola ya no se rinda.** Antes, un ciclo que
   * fallaba entero dejaba el trabajo esperando un disparo externo —un cambio
   * de red, un reintento manual— que podía no llegar nunca; y las fotos ni
   * siquiera tenían eso, porque un fallo las sacaba de la fila para siempre.
   * Ahora lo que quedó pendiente se reintenta solo, indefinidamente.
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
      if (montadoRef.current) setPulso((n) => n + 1);
    }, esperaRef.current);
  }, []);

  /** La espera vuelve a cero: hay una razón nueva para creer que sí se puede. */
  const reiniciarEspera = useCallback(() => {
    esperaRef.current = 0;
    finDeEsperaRef.current = 0;
    if (reintentoRef.current) {
      clearTimeout(reintentoRef.current);
      reintentoRef.current = null;
    }
  }, []);

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

  /**
   * Rescate de una sola vez de las fotos que murieron bajo la regla vieja.
   *
   * Los teléfonos que ya estuvieron en obra traen fotos en `failed` que no
   * fallaron de verdad: la regla anterior mandaba ahí cualquier tropiezo de
   * red. Sin esto, instalar la versión nueva arreglaría los reportes futuros y
   * dejaría los de esta semana bloqueados para siempre, que es justo el
   * trabajo que ya costó una jornada en campo.
   *
   * La marca vive en `AsyncStorage` y no en Realm para no pedir una migración
   * de esquema por algo que ocurre una vez en la vida de la instalación.
   */
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (await AsyncStorage.getItem(MARCA_RESCATE)) return;
        if (!vivo) return;
        const revividas = rescatarFotosDetenidas();
        await AsyncStorage.setItem(MARCA_RESCATE, new Date().toISOString());
        if (revividas > 0) {
          console.log(
            `[ReporteSync] Rescate único: ${revividas} foto(s) detenida(s) vuelven a la fila`,
          );
        }
      } catch (error) {
        // Que falle el rescate no puede impedir que el worker arranque: lo
        // que hay en la fila sigue saliendo igual.
        console.warn("[ReporteSync] No se pudo correr el rescate único", error);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [rescatarFotosDetenidas]);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      if (reintentoRef.current) clearTimeout(reintentoRef.current);
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
          // Vacío solo en los reportes encolados antes de que existiera la
          // firma (schemaVersion 19). Se omite el campo y el servidor cae a la
          // del perfil del autor, que es quien capturó el reporte.
          ...(item.firmaJson
            ? { firma: JSON.parse(item.firmaJson) as FirmaPayload }
            : {}),
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
        const permanente = esPermanente(error);

        const mensaje = permanente
          ? `El servidor rechazó el reporte (${status}). ${
              error instanceof Error ? error.message : ""
            }`.trim()
          : error instanceof Error
            ? error.message
            : "Error desconocido al enviar el reporte";

        if (permanente) {
          markAsFailed(item._id, mensaje, true);
        } else {
          /**
           * **El reporte ya no se queda sin intentos.** Antes gastaba tres en
           * siete segundos —el espaciado dormía DENTRO del ciclo, retrasando
           * de paso las fotos de los demás reportes— y después se detenía para
           * siempre. En una obra con señal por zonas eso es perder el reporte
           * por haberlo guardado en el lugar equivocado.
           *
           * Ahora vuelve a la fila sin pasar por `failed` y el espaciado lo
           * pone el ciclo, que espera cada vez un poco más. `failed` queda
           * reservado para el rechazo explícito del servidor, que es lo único
           * que de verdad necesita que una persona decida.
           */
          aplazarReporte(item._id, mensaje);
        }
        return false;
      }
    },
    [markAsSyncing, markAsFailed, aplazarReporte, completeReporteSyncAtomic],
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

          /**
           * El archivo local se lee aparte del resto porque es el ÚNICO fallo
           * de foto que de verdad es definitivo: si el archivo ya no está en
           * el teléfono, ningún reintento lo va a traer de vuelta.
           */
          let blob;
          try {
            blob = await uriToBlob(foto.localUri);
          } catch (error) {
            // Un plazo vencido leyendo el disco no dice que el archivo no
            // esté: dice que el teléfono anda lento. Solo el resto —no se
            // puede abrir— es definitivo.
            if (error instanceof Error && error.name === "AbortError") {
              aplazarFoto(
                foto._id,
                "No se pudo leer el archivo de la fotografía a tiempo.",
              );
            } else {
              setPhotoStatus(
                foto._id,
                "failed",
                "El archivo de la fotografía ya no está en este teléfono.",
              );
            }
            return false;
          }

          const resultado = await uploadToAzureBlob(
            sas.upload_url,
            blob,
            sas.instructions.headers["Content-Type"] ?? "image/jpeg",
          );

          if (!resultado.success) {
            const mensaje =
              resultado.errorMessage ?? "Error al subir la fotografía";
            /**
             * Solo un rechazo explícito de Blob detiene la foto. Un `403` es
             * el SAS caducado —`expired_sas`—, y el siguiente intento pide uno
             * nuevo sobre la misma ruta, así que es de los que SÍ se
             * reintentan. Un corte de red tampoco dice nada sobre el próximo
             * intento.
             */
            if (resultado.errorType === "forbidden") {
              setPhotoStatus(foto._id, "failed", mensaje);
            } else {
              aplazarFoto(foto._id, mensaje);
            }
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
        /**
         * Mismo corte que el reporte. Y un `uploaded` NUNCA se detiene: los
         * bytes ya están en Blob y lo único que falta es una confirmación que
         * el servidor trata como idempotente, así que insistir no cuesta nada
         * y rendirse costaría el reporte entero.
         */
        if (!soloConfirmar && esPermanente(error)) {
          setPhotoStatus(foto._id, "failed", mensaje);
        } else {
          aplazarFoto(foto._id, mensaje);
        }
        return false;
      }
    },
    [setPhotoStatus, aplazarFoto],
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
    /**
     * Reportes que este ciclo movió —se enviaron, o les subió alguna foto—.
     *
     * Es lo que permite avisar en el instante correcto. El aviso de éxito no
     * puede colgarse de "se envió un reporte": las fotos de un reporte pueden
     * cerrar DOS ciclos después, y entonces ese ciclo no envía nada y el
     * usuario no se enteraría nunca de que su reporte ya se puede generar.
     */
    const tocados = new Set<string>();

    try {
      for (const item of [...leerTrabajoPendiente().reportes]) {
        // Solo el montaje: `isOnline` es un valor capturado por el closure y no
        // cambia a media vuelta, así que revisarlo aquí nunca hizo nada. Si la
        // red se cae en medio, lo que corta es el fallo de la petición.
        if (!montadoRef.current) break;
        const localId = item._id;
        if (await enviarReporte(item)) {
          reportesEnviados += 1;
          tocados.add(localId);
        } else fallos += 1;
      }

      // Se RELEEN de Realm, no se usa el snapshot del render que creó este
      // callback: las fotos del reporte que se acaba de enviar recién ahora
      // tienen `fotoRemotaId`, y en aquel snapshot todavía valían `null`, así
      // que el filtro las excluía. Iterar el snapshot recorría una lista vacía
      // y la foto se quedaba esperando un ciclo que no llegaba.
      for (const foto of leerTrabajoPendiente().fotos) {
        if (!montadoRef.current) break;
        const localId = foto.reporteLocalId;
        if (await subirFoto(foto)) {
          fotosSubidas += 1;
          tocados.add(localId);
        } else fallos += 1;
      }

      // ANTES de purgar: `removeDoneReportes` borra justo las filas que esto
      // necesita leer.
      const disponibles = leerReportesDisponibles(tocados);

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

      /**
       * "Reporte enviado" cuando el reporte queda DISPONIBLE, no cuando
       * responde el POST.
       *
       * Antes salía al 201, cuando todavía faltaban las fotos y no se podía
       * generar nada: el único aviso de la app que dice "ya puedes generar"
       * apareciéndose cuando aún no se podía. "ABRIR" lo convierte en el
       * camino de un toque al archivo —y por id de SERVIDOR, que es el que
       * sobrevive a la purga de la cola—.
       *
       * El aviso sale esté el usuario donde esté, incluso capturando otro
       * reporte: es un aviso, y abrir o no es su decisión. Y sale solo en el
       * teléfono que guardó el reporte, porque el worker recorre únicamente
       * la cola de este dispositivo.
       */
      if (disponibles.length === 1) {
        const [listo] = disponibles;
        showSnackbar("Reporte enviado", "success", {
          label: "ABRIR",
          onPress: () =>
            navigateReportes("ReporteDetalle", {
              reporteId: listo.reporteId,
              constructionName: listo.constructionName,
              fechaReporte: listo.fechaReporte,
              // Solo el autor tiene este reporte en su cola.
              esAutor: true,
            }),
        });
      } else if (disponibles.length > 1) {
        // Con varios no hay un detalle al que abrir —elegir uno por el usuario
        // sería adivinar—, así que ABRIR lleva a la lista, donde están todos
        // con su chip.
        showSnackbar(`${disponibles.length} reportes enviados`, "success", {
          label: "ABRIR",
          onPress: () => navigateReportes("ReportSelection"),
        });
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
        // Algo se movió: la espera vuelve a cero. Si hubo progreso, la red
        // sirve, y hacer esperar al resto del trabajo sería gratuito.
        reiniciarEspera();
        const { reportes, fotos } = leerTrabajoPendiente();
        if (reportes.length > 0 || fotos.length > 0) {
          setPulso((n) => n + 1);
        }
      } else if (fallos > 0) {
        // El ciclo no logró mover nada. **Se vuelve a intentar igual**, solo
        // que más tarde cada vez. Antes aquí se dejaba de intentar y el
        // trabajo quedaba esperando un disparo externo que podía no llegar.
        programarReintento();
      }
    }
  }, [
    isOnline,
    isAuthenticated,
    pendingCount,
    fotosListasParaSubir,
    leerTrabajoPendiente,
    leerReportesDisponibles,
    enviarReporte,
    subirFoto,
    queryClient,
    removeDonePhotos,
    removeDoneReportes,
    showSnackbar,
    programarReintento,
    reiniciarEspera,
  ]);

  /**
   * La red volvió: se cancela la espera.
   *
   * Va ANTES del efecto que dispara el ciclo —los efectos corren en orden de
   * declaración— para que ese vea la espera ya en cero y salga a intentarlo de
   * inmediato. Lo que llevaba cinco minutos esperando no tiene por qué seguir
   * esperando ahora que hay por dónde salir, y recuperar la señal al cambiar
   * de zona es justo el momento en que el usuario espera que la app reaccione.
   */
  useEffect(() => {
    if (isOnline !== true) return;
    reiniciarEspera();
  }, [isOnline, reiniciarEspera]);

  useEffect(() => {
    if (isOnline === false || !isAuthenticated || enCursoRef.current) return;
    if (pendingCount === 0 && fotosListasParaSubir.length === 0) return;
    // Dentro de la ventana de espera no se dispara: el temporizador de
    // `programarReintento` es quien va a reabrirla. Sin esto, cualquier render
    // —y la cola produce varios por ciclo— reiniciaría el intento de
    // inmediato, que es girar en vacío contra una red que no está.
    if (Date.now() < finDeEsperaRef.current) return;

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
    // Que lo pida una persona reinicia la espera: sabe algo que el teléfono
    // no —que ya hay señal, que acaba de salir del sótano—.
    reiniciarEspera();
    await procesarCola();
  }, [isOnline, procesarCola, showSnackbar, reiniciarEspera]);

  const retryItem = useCallback(
    async (id: string) => {
      const item = getItemById(id);
      if (!item || item.status !== "failed") return;
      markAsPending(id);
      // Que lo pida una persona también reinicia la espera del ciclo.
      reiniciarEspera();
      if (isOnline !== false) await procesarCola();
    },
    [getItemById, markAsPending, reiniciarEspera, isOnline, procesarCola],
  );

  return { isSyncing, syncNow, retryItem };
}

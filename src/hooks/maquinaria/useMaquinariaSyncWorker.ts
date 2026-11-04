import { useCallback, useEffect, useRef, useState } from "react";

import { useRealm } from "@realm/react";
import { useQueryClient } from "@tanstack/react-query";

import { useAppSelector } from "src/redux/hooks";
import { ApiError } from "src/services/api/apiClient";
import {
  createCaptura,
  createMaquinaria,
} from "src/hooks/data/api/maquinariaApi";
import { MAQUINARIA_QUERY_KEYS } from "src/hooks/data/query/maquinariaQueries.const";
import type {
  ConflictoCaptura,
  CreateCapturaBody,
  MotivoInactividad,
} from "src/types/maquinaria";
import type { PendingCapturaSubmission } from "src/realm/pendingJornada/PendingCapturaSubmission";
import type { PendingMaquinariaSubmission } from "src/realm/pendingMaquinaria/PendingMaquinariaSubmission";

import { useNetworkStatus } from "../utils/useNetworkStatus";
import { llaveMaquina, usePendingCapturaQueue } from "./usePendingCapturaQueue";
import { usePendingMaquinariaQueue } from "./usePendingMaquinariaQueue";

const DEBOUNCE_MS = 500;

/**
 * El presupuesto de reintentos se mide en TIEMPO, no en intentos (F48).
 *
 * Tres intentos gastados en siete segundos no significan nada en una jornada
 * de ocho horas: es lo que detenía una máquina el resto del día por tres
 * cortes de red en una mañana. Ahora el ciclo se reprograma solo, con espera
 * creciente, y la espera se reinicia cuando algo avanza, cuando vuelve la red
 * o cuando una persona toca Sincronizar.
 *
 * Cinco minutos de techo: una zona con señal al mediodía vacía la cola de
 * inmediato por el reinicio, así que el techo solo gobierna el caso en que no
 * vuelve nada.
 */
const ESPERA_BASE_MS = 5_000;
const ESPERA_MAXIMA_MS = 5 * 60 * 1000;

/**
 * Drena las DOS colas de maquinaria: altas y capturas, **en ese orden**.
 *
 * El orden es el punto y es la razón de que vivan en un solo worker. Una
 * captura de una máquina dada de alta sin señal no puede enviarse antes que su
 * alta: no existe la estancia a la que colgarla. El lazo de altas corre
 * primero, copia el `estancia_id` que responde el servidor a las capturas que
 * lo esperaban, y recién entonces corre el lazo de capturas.
 *
 * Partirlos en dos workers dejaría ese orden al azar de dos temporizadores.
 *
 * **Vive en `SyncWorkerProvider`, nunca montado en una pantalla.** Montarlo en
 * el hub crearía un segundo worker sobre la misma cola, con dos ciclos
 * pisándose — y además la cola tiene que drenarse aunque el usuario nunca
 * vuelva a abrir la tab de maquinaria.
 */
export function useMaquinariaSyncWorker() {
  const queryClient = useQueryClient();
  const realm = useRealm();
  const isOnline = useNetworkStatus();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const {
    pendingCount,
    getItemById,
    leerTrabajoPendiente,
    markAsSyncing,
    markAsPending,
    aplazar,
    markAsFailed,
    markAsDone,
    resetStuckSyncingItems,
    removeDoneCapturas,
  } = usePendingCapturaQueue();

  const {
    pendingCount: altasPendientes,
    leerTrabajoPendiente: leerAltasPendientes,
    markAsSyncing: marcarAltaEnviando,
    aplazarAlta,
    markAsFailed: marcarAltaFallida,
    completarAltaYEnlazar,
    resetStuckSyncingItems: rescatarAltasEncalladas,
    removeDoneMaquinarias,
  } = usePendingMaquinariaQueue();

  const [isSyncing, setIsSyncing] = useState(false);
  /**
   * Reprograma el ciclo cuando algo avanzó.
   *
   * Es ESTADO y no un ref a propósito: `enCursoRef` no provoca render, así que
   * un disparo que llegaba con el ciclo en curso se perdía para siempre. Fue
   * la mitad del bug que dejaba fotos esperando con red perfecta.
   */
  const [pulso, setPulso] = useState(0);

  const enCursoRef = useRef(false);
  const montadoRef = useRef(true);

  /** Espera actual del respaldo, y el instante en que vence. */
  const esperaRef = useRef(0);
  const finDeEsperaRef = useRef(0);
  const reintentoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Programa el siguiente intento, duplicando la espera.
   *
   * Vive FUERA del ciclo. Antes la espera se dormía dentro del lazo, con un
   * `await` entre dos envíos: el ciclo entero se quedaba detenido, así que un
   * corte en una máquina retrasaba el trabajo de todas las demás.
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
      if (montadoRef.current) setPulso((p) => p + 1);
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

  useEffect(() => {
    const rescatadas = resetStuckSyncingItems();
    const altas = rescatarAltasEncalladas();
    if (rescatadas > 0 || altas > 0) {
      console.log(
        `[MaquinariaSync] liberadas: ${altas} alta(s), ${rescatadas} captura(s)`,
      );
    }
    // Solo al montar: rescata lo que quedó a medias de una sesión anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      if (reintentoRef.current) clearTimeout(reintentoRef.current);
    };
  }, []);

  /**
   * Clasificación compartida: un 4xx no se arregla reintentando, un 5xx o un
   * corte sí. 408 y 429 son 4xx pero significan "vuelve a intentar".
   */
  const esPermanente = (status: number | undefined) =>
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429;

  const enviarAlta = useCallback(
    async (item: PendingMaquinariaSubmission): Promise<boolean> => {
      marcarAltaEnviando(item._id);

      try {
        const respuesta = await createMaquinaria({
          client_id: item._id,
          construction: item.constructionId,
          tipo: item.tipoId,
          marca: item.marca,
          modelo: item.modelo,
          propietario_tipo: item.propietarioTipo as never,
          tipo_permanencia: item.tipoPermanencia as never,
          fecha_ingreso: item.fechaIngreso,
        });

        if (respuesta.estancia_id == null) {
          // No debería ocurrir —el servidor abre la estancia en la misma
          // transacción— pero si ocurriera, marcarla `done` dejaría sus
          // capturas esperando un enlace que nunca llega. Mejor fallar fuerte.
          marcarAltaFallida(
            item._id,
            "El servidor no devolvió la estancia del alta",
            true,
          );
          return false;
        }

        // Atómico: cierra el alta Y reescribe las capturas que la esperaban.
        const enlazadas = completarAltaYEnlazar(
          item._id,
          respuesta.id,
          respuesta.estancia_id,
        );
        if (enlazadas > 0) {
          console.log(
            `[MaquinariaSync] ${enlazadas} captura(s) enlazadas a la estancia ${respuesta.estancia_id}`,
          );
        }
        return true;
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;

        /**
         * **Dos desenlaces, no tres (F48).** O el servidor contestó y dijo que
         * no —y entonces el alta se detiene y pide a una persona—, o cualquier
         * otra cosa, y vuelve a la fila. Lo que no existe ya es el tercer
         * desenlace de antes: "se acabaron los intentos", que convertía un
         * problema de red en un alta muerta.
         */
        if (esPermanente(status)) {
          marcarAltaFallida(
            item._id,
            `El servidor rechazó el alta (${status}). ${
              error instanceof Error ? error.message : ""
            }`.trim(),
            true,
          );
          return false;
        }

        // Sin dormir aquí: el espaciado lo pone el ciclo, que es el único que
        // puede esperar sin dejar a las demás máquinas detenidas.
        aplazarAlta(
          item._id,
          error instanceof Error
            ? error.message
            : "Error desconocido al dar de alta la máquina",
        );
        return false;
      }
    },
    [marcarAltaEnviando, marcarAltaFallida, aplazarAlta, completarAltaYEnlazar],
  );

  /**
   * El cuerpo de `POST /capturas/` desde la fila de la cola.
   *
   * Los renglones van ordenados por `orden`: el servidor numera por POSICIÓN
   * en el arreglo, y mandarlos revueltos renumeraría las actividades.
   */
  const cuerpoDe = (item: PendingCapturaSubmission): CreateCapturaBody => {
    const cuerpo: CreateCapturaBody = {
      client_id: item._id,
      estancia: item.estanciaId,
      fecha: item.fecha,
      registrado_en: item.registradoEn,
    };
    if (item.cerrarAnteriorFinal !== null) {
      cuerpo.cerrar_anterior = { final: item.cerrarAnteriorFinal };
      return cuerpo;
    }
    if (item.cerrarAnteriorSinFinal) {
      cuerpo.cerrar_anterior = { sin_final: true };
      return cuerpo;
    }
    if (item.estado === "SIN_OPERAR") {
      cuerpo.estado = "SIN_OPERAR";
      cuerpo.motivo_inactividad = item.motivoInactividad as MotivoInactividad;
      cuerpo.observaciones = item.observaciones || undefined;
      return cuerpo;
    }
    if (item.horometroInicial) cuerpo.horometro_inicial = item.horometroInicial;
    if (item.horometroFinal) cuerpo.horometro_final = item.horometroFinal;
    if (item.observaciones) cuerpo.observaciones = item.observaciones;
    const detalles = Array.from(item.detalles).sort((a, b) => a.orden - b.orden);
    if (detalles.length) {
      cuerpo.detalles = detalles.map((d) => ({
        concept_id: d.concept ?? undefined,
        descripcion: d.descripcion || undefined,
        horas_estimadas: d.horas_estimadas ?? undefined,
      }));
    }
    return cuerpo;
  };

  const enviarCaptura = useCallback(
    async (item: PendingCapturaSubmission): Promise<boolean> => {
      markAsSyncing(item._id);

      try {
        const jornada = await createCaptura(cuerpoDe(item));
        markAsDone(item._id, jornada.fecha);
        return true;
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;

        /**
         * Un 4xx NO se arregla reintentando: el servidor entendió y rechazó,
         * y el mismo cuerpo producirá el mismo rechazo. Un 5xx, un timeout o
         * un corte sí. 408 y 429 son 4xx pero significan "vuelve a intentar".
         *
         * El 409 es el caso que vale nombrar: la máquina tiene un turno sin
         * cerrar o un cierre olvidado, quizá capturado desde otro teléfono.
         * Su `motivo` viaja a la tarjeta para que "Requiere atención" diga
         * algo útil.
         */
        const permanente = esPermanente(status);
        const conflicto =
          status === 409 && error instanceof ApiError
            ? ((
                error.originalError as {
                  response?: { data?: ConflictoCaptura };
                }
              )?.response?.data ?? null)
            : null;

        if (permanente) {
          markAsFailed(
            item._id,
            conflicto?.detail
              ? conflicto.detail
              : `El servidor rechazó la captura (${status}). ${
                  error instanceof Error ? error.message : ""
                }`.trim(),
            true,
            conflicto?.motivo ?? null,
          );
          return false;
        }

        /**
         * **Todo lo demás vuelve a la fila (F48).**
         *
         * Antes esto pasaba por `failed` y gastaba uno de tres intentos. Una
         * subida cortada por señal débil —el caso más común de la obra, no el
         * raro— contaba igual que un rechazo del servidor, y a la tercera la
         * máquina quedaba detenida hasta que alguien la rescatara a mano.
         *
         * Sin dormir aquí: el espaciado lo pone el ciclo. Dormir dentro del
         * lazo detenía de paso el trabajo de todas las demás máquinas.
         */
        aplazar(
          item._id,
          error instanceof Error
            ? error.message
            : "Error desconocido al enviar la captura",
        );
        return false;
      }
    },
    [markAsSyncing, markAsFailed, aplazar, markAsDone],
  );

  const procesarCola = useCallback(async () => {
    // `isOnline === false` y no `!isOnline`: `null` significa "todavía no se
    // sabe", y tratarlo como "sin red" deja la cola trabada. Ante la duda se
    // intenta — un POST sin señal falla y se reintenta, que es barato.
    if (enCursoRef.current || isOnline === false || !isAuthenticated) return;
    if (pendingCount === 0 && altasPendientes === 0) return;

    enCursoRef.current = true;
    setIsSyncing(true);

    // La purga de lo confirmado corre AL EMPEZAR, y solo de lo que el caché
    // del hub YA trae: lo confirmado antes de su última escritura. Purgar lo
    // demás dejaría un hueco en la hoja —la captura enviada y el hub todavía
    // sin ella— hasta el siguiente refetch.
    const hubEscritoEn = realm
      .objects("MaquinariaHubResponse")
      .max("updatedAt") as Date | undefined;
    removeDoneCapturas(hubEscritoEn ?? null);
    removeDoneMaquinarias();

    let enviadas = 0;
    let fallos = 0;

    try {
      // ── 1 · Las altas PRIMERO ────────────────────────────────────────
      // De su `estancia_id` dependen las capturas que esperan. Si este lazo no
      // corriera antes, esas capturas se saltarían un ciclo completo.
      for (const alta of [...leerAltasPendientes()]) {
        if (!montadoRef.current) break;
        if (await enviarAlta(alta)) enviadas += 1;
        else fallos += 1;
      }

      // ── 2 · Y después las capturas ───────────────────────────────────
      // Se RELEEN de Realm: las que acaban de recibir su `estanciaId` en el
      // lazo de arriba todavía esperaban su alta en la copia vieja.
      //
      // Por máquina y en orden: si una falla en este ciclo, las siguientes de
      // ESA máquina no salen. Un cierre detrás de un arranque fallido solo
      // produciría otro error.
      const caidas = new Set<string>();
      for (const item of [...leerTrabajoPendiente()]) {
        if (!montadoRef.current) break;
        const llave = llaveMaquina(item);
        if (caidas.has(llave)) continue;
        if (await enviarCaptura(item)) enviadas += 1;
        else {
          fallos += 1;
          caidas.add(llave);
        }
      }

      if (enviadas > 0) {
        // El hub se invalida DESPUÉS de enviar todo, no por captura: con cinco
        // máquinas serían cinco refetch del mismo endpoint.
        //
        // Las `done` NO se purgan aquí: se quedan hasta el ciclo siguiente
        // (ver arriba). Mientras tanto la tarjeta las prefiere solo si el hub
        // aún no trae la jornada, así que no pueden pisar al servidor.
        await queryClient.invalidateQueries({
          queryKey: [MAQUINARIA_QUERY_KEYS.HUB_DIARIO],
        });
      }
    } finally {
      enCursoRef.current = false;
      if (montadoRef.current) setIsSyncing(false);

      if (enviadas > 0) {
        // Algo avanzó: la red está sirviendo, así que la espera acumulada ya
        // no describe nada. Se borra y se vuelve a pasar enseguida, por si lo
        // que quedó atrás de un alta ya puede salir.
        reiniciarEspera();
        if (montadoRef.current) setPulso((p) => p + 1);
      } else if (fallos > 0) {
        // Nada salió y algo lo intentó: se vuelve, más tarde cada vez. Lo que
        // NO se hace es rendirse — en una obra, "no pude ahora" es la
        // respuesta normal, no el final del camino.
        programarReintento();
      }
    }
  }, [
    isOnline,
    isAuthenticated,
    pendingCount,
    altasPendientes,
    leerTrabajoPendiente,
    leerAltasPendientes,
    enviarCaptura,
    enviarAlta,
    queryClient,
    realm,
    removeDoneCapturas,
    removeDoneMaquinarias,
    programarReintento,
    reiniciarEspera,
  ]);

  /**
   * Volver a tener red borra la espera.
   *
   * Va declarado ANTES del disparador a propósito: los efectos corren en orden
   * de declaración, así que para cuando el de abajo mira la ventana, esta ya
   * está limpia y el intento sale de inmediato en vez de esperar los cinco
   * minutos que había acumulado sin señal. Es el caso de la obra: se sale de
   * la zona muerta y la cola tiene que vaciarse al llegar, no un rato después.
   *
   * Deliberadamente sin `setPulso`: cambiar `isOnline` ya vuelve a correr el
   * disparador, y agregar estado aquí sería escribir estado dentro de un
   * efecto por nada.
   */
  useEffect(() => {
    if (isOnline === true) reiniciarEspera();
  }, [isOnline, reiniciarEspera]);

  useEffect(() => {
    if (isOnline === false || !isAuthenticated || enCursoRef.current) return;
    if (pendingCount === 0 && altasPendientes === 0) return;
    // Dentro de la ventana de espera no se insiste: el temporizador del
    // respaldo despertará al ciclo cuando toque.
    if (Date.now() < finDeEsperaRef.current) return;

    const timeoutId = setTimeout(procesarCola, DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [
    isOnline,
    isAuthenticated,
    pendingCount,
    altasPendientes,
    pulso,
    procesarCola,
  ]);

  /**
   * Sincronizar a mano. **Borra la espera**: una persona que toca el botón
   * está diciendo "ahora", y hacerla esperar el respaldo sería contestarle que
   * no a algo que sí se puede intentar.
   */
  const syncNow = useCallback(async () => {
    if (isOnline === false) return;
    reiniciarEspera();
    await procesarCola();
  }, [isOnline, procesarCola, reiniciarEspera]);

  const retryItem = useCallback(
    async (id: string) => {
      const item = getItemById(id);
      if (!item || item.status !== "failed") return;
      markAsPending(id);
      reiniciarEspera();
      if (isOnline !== false) await procesarCola();
    },
    [getItemById, markAsPending, isOnline, procesarCola, reiniciarEspera],
  );

  return { isSyncing, syncNow, retryItem };
}

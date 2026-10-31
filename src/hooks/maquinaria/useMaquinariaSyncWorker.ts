import { useCallback, useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useAppSelector } from "src/redux/hooks";
import { ApiError } from "src/services/api/apiClient";
import {
  createJornada,
  createMaquinaria,
} from "src/hooks/data/api/maquinariaApi";
import { MAQUINARIA_QUERY_KEYS } from "src/hooks/data/query/maquinariaQueries.const";
import type {
  CreateJornadaBody,
  MotivoInactividad,
} from "src/types/maquinaria";
import type { PendingJornadaSubmission } from "src/realm/pendingJornada/PendingJornadaSubmission";
import type { PendingMaquinariaSubmission } from "src/realm/pendingMaquinaria/PendingMaquinariaSubmission";

import { useNetworkStatus } from "../utils/useNetworkStatus";
import { usePendingJornadaQueue } from "./usePendingJornadaQueue";
import { usePendingMaquinariaQueue } from "./usePendingMaquinariaQueue";

const DEBOUNCE_MS = 500;
const RETRY_DELAY_BASE_MS = 1000;

/**
 * Drena las DOS colas de maquinaria: altas y jornadas, **en ese orden**.
 *
 * El orden es el punto y es la razón de que vivan en un solo worker. Una
 * jornada de una máquina dada de alta sin señal no puede enviarse antes que su
 * alta: no existe la estancia a la que colgarla. El lazo de altas corre
 * primero, copia el `estancia_id` que responde el servidor a las jornadas que
 * lo esperaban, y recién entonces corre el lazo de jornadas.
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
  const isOnline = useNetworkStatus();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const {
    pendingCount,
    getItemById,
    leerTrabajoPendiente,
    markAsSyncing,
    markAsPending,
    markAsFailed,
    markAsDone,
    resetStuckSyncingItems,
    removeDoneJornadas,
  } = usePendingJornadaQueue();

  const {
    pendingCount: altasPendientes,
    leerTrabajoPendiente: leerAltasPendientes,
    markAsSyncing: marcarAltaEnviando,
    markAsPending: marcarAltaPendiente,
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

  useEffect(() => {
    const rescatadas = resetStuckSyncingItems();
    const altas = rescatarAltasEncalladas();
    if (rescatadas > 0 || altas > 0) {
      console.log(
        `[MaquinariaSync] liberadas: ${altas} alta(s), ${rescatadas} jornada(s)`,
      );
    }
    // Solo al montar: rescata lo que quedó a medias de una sesión anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
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
          // jornadas esperando un enlace que nunca llega. Mejor fallar fuerte.
          marcarAltaFallida(
            item._id,
            "El servidor no devolvió la estancia del alta",
            true,
          );
          return false;
        }

        // Atómico: cierra el alta Y reescribe las jornadas que la esperaban.
        const enlazadas = completarAltaYEnlazar(
          item._id,
          respuesta.id,
          respuesta.estancia_id,
        );
        if (enlazadas > 0) {
          console.log(
            `[MaquinariaSync] ${enlazadas} jornada(s) enlazadas a la estancia ${respuesta.estancia_id}`,
          );
        }
        return true;
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;
        const permanente = esPermanente(status);

        marcarAltaFallida(
          item._id,
          permanente
            ? `El servidor rechazó el alta (${status}). ${
                error instanceof Error ? error.message : ""
              }`.trim()
            : error instanceof Error
              ? error.message
              : "Error desconocido al dar de alta la máquina",
          permanente,
        );

        if (!permanente && item.retryCount < item.maxRetries) {
          const espera = RETRY_DELAY_BASE_MS * Math.pow(2, item.retryCount);
          await new Promise((resolve) => setTimeout(resolve, espera));
          marcarAltaPendiente(item._id);
        }
        return false;
      }
    },
    [
      marcarAltaEnviando,
      marcarAltaFallida,
      marcarAltaPendiente,
      completarAltaYEnlazar,
    ],
  );

  const enviarJornada = useCallback(
    async (item: PendingJornadaSubmission): Promise<boolean> => {
      markAsSyncing(item._id);

      try {
        // Ordenados por `orden` y no por el orden de la lista: el servidor
        // numera por POSICIÓN en el arreglo, así que mandarlos revueltos
        // renumeraría las actividades del supervisor.
        const detalles = Array.from(item.detalles)
          .sort((a, b) => a.orden - b.orden)
          .map((d) => ({
            concept_id: d.concept ?? undefined,
            descripcion: d.descripcion || undefined,
            horas_estimadas: d.horas_estimadas ?? undefined,
          }));

        const respuesta = await createJornada(
          (item.estado === "TRABAJANDO"
            ? {
                client_id: item._id,
                estancia: item.estanciaId,
                fecha: item.fecha,
                estado: "TRABAJANDO",
                detalles,
                observaciones: item.observaciones || undefined,
                horometro_inicial: item.horometroInicial ?? undefined,
                horometro_final: item.horometroFinal ?? undefined,
              }
            : {
                client_id: item._id,
                estancia: item.estanciaId,
                fecha: item.fecha,
                estado: "SIN_OPERAR",
                motivo_inactividad: item.motivoInactividad as MotivoInactividad,
                observaciones: item.observaciones || undefined,
              }) as CreateJornadaBody,
        );

        markAsDone(item._id, respuesta.id);
        return true;
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;

        /**
         * Un 4xx NO se arregla reintentando: el servidor entendió y rechazó, y
         * el mismo cuerpo producirá el mismo rechazo. Un 5xx, un timeout o un
         * corte sí. 408 y 429 son 4xx pero significan "vuelve a intentar".
         *
         * Gastar los tres intentos en siete segundos contra un error temporal
         * convierte una falla pasajera en pérdida permanente.
         */
        const permanente =
          status !== undefined &&
          status >= 400 &&
          status < 500 &&
          status !== 408 &&
          status !== 429;

        const mensaje = permanente
          ? `El servidor rechazó la jornada (${status}). ${
              error instanceof Error ? error.message : ""
            }`.trim()
          : error instanceof Error
            ? error.message
            : "Error desconocido al enviar la jornada";

        markAsFailed(item._id, mensaje, permanente);

        // Sin `+ 1`: `markAsFailed` ya incrementó, y `item` es un objeto VIVO
        // de Realm. Sumar otra vez contaba el intento dos veces y dejaba la
        // jornada en 2 de 3 para siempre, "reintentando" sin reintentar nada.
        if (!permanente && item.retryCount < item.maxRetries) {
          const espera = RETRY_DELAY_BASE_MS * Math.pow(2, item.retryCount);
          await new Promise((resolve) => setTimeout(resolve, espera));
          markAsPending(item._id);
        }
        return false;
      }
    },
    [markAsSyncing, markAsFailed, markAsPending, markAsDone],
  );

  const procesarCola = useCallback(async () => {
    // `isOnline === false` y no `!isOnline`: `null` significa "todavía no se
    // sabe", y tratarlo como "sin red" deja la cola trabada. Ante la duda se
    // intenta — un POST sin señal falla y se reintenta, que es barato.
    if (enCursoRef.current || isOnline === false || !isAuthenticated) return;
    if (pendingCount === 0 && altasPendientes === 0) return;

    enCursoRef.current = true;
    setIsSyncing(true);

    // La purga de lo confirmado corre AL EMPEZAR, no al cerrar.
    //
    // Antes iba al final del mismo ciclo que las enviaba, y eso dejaba una
    // trampa: si el refetch del hub no aterrizaba —en dispositivo, por un
    // error al guardarlo en Realm— se borraba la copia local de una jornada
    // que el hub todavía no traía, y la tarjeta volvía a "Sin reportar hoy"
    // sobre algo que YA estaba en el servidor.
    //
    // Al moverla aquí, lo enviado sobrevive un ciclo completo. Si el hub falló,
    // la tarjeta sigue diciendo "Enviando" en vez de mentir.
    removeDoneJornadas();
    removeDoneMaquinarias();

    let enviadas = 0;

    try {
      // ── 1 · Las altas PRIMERO ────────────────────────────────────────
      // De su `estancia_id` dependen las jornadas que esperan. Si este lazo no
      // corriera antes, esas jornadas se saltarían un ciclo completo.
      for (const alta of [...leerAltasPendientes()]) {
        if (!montadoRef.current) break;
        if (await enviarAlta(alta)) enviadas += 1;
      }

      // ── 2 · Y después las jornadas ───────────────────────────────────
      // Se RELEEN de Realm, no se usa el snapshot que capturó este callback:
      // las que acaban de recibir su `estanciaId` en el lazo de arriba todavía
      // valían `maquinariaLocalId != null` en aquella copia, así que el filtro
      // las habría excluido. Es el mismo bug que dejaba fotos esperando.
      for (const item of [...leerTrabajoPendiente()]) {
        if (!montadoRef.current) break;
        if (await enviarJornada(item)) enviadas += 1;
      }

      if (enviadas > 0) {
        // El hub se invalida DESPUÉS de enviar todo, no por jornada: con cinco
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
      // Solo si el ciclo avanzó: reprogramar siempre giraría en vacío contra
      // un fallo permanente.
      if (enviadas > 0 && montadoRef.current) setPulso((p) => p + 1);
    }
  }, [
    isOnline,
    isAuthenticated,
    pendingCount,
    altasPendientes,
    leerTrabajoPendiente,
    leerAltasPendientes,
    enviarJornada,
    enviarAlta,
    queryClient,
    removeDoneJornadas,
    removeDoneMaquinarias,
  ]);

  useEffect(() => {
    if (isOnline === false || !isAuthenticated || enCursoRef.current) return;
    if (pendingCount === 0 && altasPendientes === 0) return;

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

  const syncNow = useCallback(async () => {
    if (isOnline === false) return;
    await procesarCola();
  }, [isOnline, procesarCola]);

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

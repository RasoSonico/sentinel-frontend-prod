import { useQuery } from "@tanstack/react-query";

import { getProveedores } from "src/modules/reportes/services/reporteService";
import { REPORTE_QUERY_KEYS } from "../data/query/reporteQueries.const";

/**
 * Roster de contratistas de la obra (ADR-006, D1).
 *
 * **Es la única llamada de red del wizard**, y va aquí porque el usuario no
 * puede seleccionar de una lista que no tiene. Del paso 1 en adelante toda la
 * captura ocurre en memoria y toda escritura pasa por la cola: ninguna pantalla
 * del wizard abre una ruta de red propia (misma regla que D13.1 del ADR-004).
 *
 * `staleTime` largo a propósito: el roster lo captura un administrador al dar
 * de alta la obra y cambia con frecuencia de meses, no de minutos. Refrescarlo
 * en cada apertura gastaría red de obra para traer lo mismo.
 */
const CINCO_MINUTOS = 5 * 60 * 1000;
const TREINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

export function useProveedores(constructionId: number | null) {
  return useQuery({
    queryKey: [REPORTE_QUERY_KEYS.PROVEEDORES, constructionId],
    queryFn: () => getProveedores(constructionId as number),
    enabled: constructionId !== null,
    staleTime: CINCO_MINUTOS,

    /**
     * `gcTime` largo: es lo que hace que el roster sobreviva sin red.
     *
     * El caché de React Query se persiste en AsyncStorage
     * (`PersistQueryClientProvider`), pero el recolector borra de memoria toda
     * consulta sin observadores pasado el `gcTime` —5 minutos por defecto— y
     * el blob persistido se regraba sin ella. Con el default, salir del módulo
     * diez minutos bastaba para quedarse sin copia: el usuario llegaba a P-00
     * en obra, sin señal, y no tenía de dónde elegir.
     *
     * Treinta días es deliberadamente generoso porque el roster pesa unas
     * pocas filas y su alternativa es no poder capturar.
     */
    gcTime: TREINTA_DIAS,

    /**
     * `offlineFirst` y no el `online` por defecto: con `online`, React Query ni
     * siquiera intenta si su detector cree que no hay red — y ese detector se
     * equivoca justo donde importa (ver `useNetworkStatus`: la sonda de
     * conectividad falla en redes de obra que sí alcanzan la API). Así se
     * intenta una vez y, si falla, la pantalla se queda con la copia guardada.
     */
    networkMode: "offlineFirst",

    // Sin reintentos: si no hay red, tres intentos solo retrasan el momento de
    // enseñar la copia que ya se tiene.
    retry: 1,
  });
}

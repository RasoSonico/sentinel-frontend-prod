import { useCallback, useMemo } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getReporteDetalle,
  getReportesPorObra,
} from "src/modules/reportes/services/reporteService";
import { useAppSelector } from "src/redux/hooks";
import type { ReporteListItem } from "src/types/reporte";

import { REPORTE_QUERY_KEYS } from "../data/query/reporteQueries.const";
import { usePendingReporteQueue } from "./usePendingReporteQueue";

/**
 * La lista de REPORTES DE LA OBRA (ADR-006, Decisión 8).
 *
 * **Fusiona la cola local del autor con la lista del servidor.** Los reportes
 * encolados existen solo en el dispositivo de quien los capturó, así que van
 * arriba con su chip "Por enviar": si no aparecieran, el autor vería
 * desaparecer su trabajo hasta que hubiera señal, que es la peor lectura
 * posible de un guardado exitoso.
 *
 * **Los reportes ajenos NO se cachean en Realm.** El detalle es JSON de unos KB
 * y las fotos son miniaturas por SAS; meter el historial completo de la obra a
 * Realm implicaría esquema y sincronización nuevos para cubrir un caso —
 * consultar reportes ajenos sin señal, sin haber abierto nunca la app con
 * señal— que hoy no lo justifica. El caché persistido de React Query alcanza.
 */

export interface FilaReporte {
  /** Clave de lista: `local:<uuid>` o `srv:<id>`. */
  clave: string;
  /** Presente solo cuando el servidor ya lo tiene. */
  reporteId: number | null;
  localId: string | null;
  fechaReporte: string;
  autor: string;
  actividadesCount: number;
  fotosCount: number;
  porEnviar: boolean;
  fallo: boolean;
  /** Ya no va a reintentar solo: necesita que una persona decida. */
  intentosAgotados: boolean;
  /** El porqué del fallo. Sin él, descartar es la única salida racional. */
  errorMessage: string | null;
  /**
   * **La única pregunta que el chip contesta: ¿ya se puede generar?**
   *
   * Requiere las dos cosas: que el reporte esté en el servidor Y que ninguna
   * foto siga subiendo. Si falta cualquiera, el endpoint de archivo responde
   * 409 y no hay nada que descargar.
   *
   * Se expone el veredicto y no los motivos a propósito. Un estado intermedio
   * —"subiendo 2 fotos"— es información que el usuario no puede accionar: le
   * falte texto o le falten fotos, la respuesta a "¿ya lo bajo?" es la misma.
   * Enseñar el desglose solo agrega un paso al que hay que prestarle atención
   * para llegar a la misma conclusión.
   */
  disponible: boolean;
  /**
   * Si quien mira es quien lo reportó.
   *
   * Se calcula aquí y no en la pantalla porque la respuesta depende de dos
   * fuentes —la cola y el id del servidor— y tenía que ser la misma en las
   * dos. La pantalla lo deducía de `porEnviar`, así que el usuario dejaba de
   * ser autor de su propio reporte en cuanto se enviaba: la telemetría
   * `reporte_archivo_generated` venía con `es_autor: false` para todo archivo
   * generado de un reporte ya entregado.
   */
  esAutor: boolean;
  createdAt: Date;
}

export function useReportesDeObra(constructionId: number | null) {
  const queryClient = useQueryClient();
  const llave = [REPORTE_QUERY_KEYS.REPORTES_POR_OBRA, constructionId];

  /**
   * **Paginada, no de una sola página (F47).**
   *
   * El servidor entrega de 15 en 15. Leer solo la primera y tirar `next` hacía
   * que el historial de la obra terminara en el reporte 15 — los anteriores
   * seguían ahí y no había forma de llegar a ellos.
   *
   * Páginas y no `page_size=100`: subir el tope mueve el muro, no lo quita, y
   * además obligaría a bajar cien reportes por obra cada vez que se abre la
   * pantalla, en una app que trabaja con señal intermitente.
   */
  const consulta = useInfiniteQuery({
    queryKey: llave,
    queryFn: ({ pageParam }) =>
      getReportesPorObra(constructionId as number, pageParam),
    initialPageParam: 1,
    // `next` viene como URL completa, pero aquí solo interesa si hay otra:
    // el número lo lleva la cuenta de páginas ya traídas. Una respuesta sin
    // paginar (arreglo pelón) no tiene siguiente y la lista se cierra ahí.
    getNextPageParam: (ultima, todas) =>
      !Array.isArray(ultima) && ultima?.next ? todas.length + 1 : undefined,
    enabled: constructionId !== null,
  });

  const { reportesEnCola } = usePendingReporteQueue();

  // El id de `/usuarios/me/` es la PK de Django en texto, y `reportado_por` es
  // esa misma PK como número: se compara en string para no depender de un
  // `Number()` sobre un campo que el backend declara como texto.
  const usuarioId = useAppSelector((state) => state.auth.user?.id) ?? null;

  const { filas, total } = useMemo<{ filas: FilaReporte[]; total: number }>(() => {
    const paginas = consulta.data?.pages ?? [];
    const delServidor: ReporteListItem[] = paginas.flatMap((pagina) =>
      Array.isArray(pagina) ? pagina : (pagina?.results ?? []),
    );

    /**
     * **Cuántos hay, no cuántos se han bajado.**
     *
     * El contador del encabezado mostraba `filas.length`, que con paginación
     * es el tamaño de lo cargado: una obra con 200 reportes decía "15" hasta
     * que alguien arrastrara hasta el final. `count` viene en cada página y
     * es el total de la obra.
     */
    const primera = paginas[0];
    const totalServidor =
      primera && !Array.isArray(primera)
        ? (primera.count ?? delServidor.length)
        : delServidor.length;

    // Un reporte recién sincronizado sale por las DOS vías durante unos
    // instantes: sigue en la cola como `done` y ya viene en la respuesta del
    // servidor. Se descarta la copia local en cuanto el servidor lo confirma —
    // así el número antes y después del refetch es el mismo y el refresco es
    // visualmente invisible (misma garantía de read-your-writes que la marca de
    // agua de la enmienda E8 de la Fase 2).
    const yaEnServidor = new Set(delServidor.map((r) => r.id));

    const locales: FilaReporte[] = reportesEnCola
      .filter((r) => constructionId === null || r.constructionId === constructionId)
      .filter((r) => r.reporteId === null || !yaEnServidor.has(r.reporteId))
      .map((r) => ({
        clave: `local:${r.localId}`,
        reporteId: r.reporteId,
        localId: r.localId,
        fechaReporte: r.fechaReporte,
        // El autor de un reporte en cola es siempre quien está viendo la
        // pantalla: nadie más puede tenerlo.
        autor: "Tú",
        actividadesCount: r.actividadesCount,
        fotosCount: r.fotosCount,
        // Un `done` ya está en el servidor aunque la lista todavía no lo
        // muestre: no es "por enviar", solo va por delante del refetch.
        porEnviar: r.status !== "done",
        fallo: r.status === "failed",
        // Un reporte en cola existe solo en el teléfono de su autor.
        esAutor: true,
        // En la cola, disponible = el POST ya respondió Y sus fotos cerraron.
        disponible: r.status === "done" && r.fotosPendientes === 0,
        intentosAgotados: r.intentosAgotados,
        errorMessage: r.errorMessage,
        createdAt: r.createdAt,
      }));

    const remotos: FilaReporte[] = delServidor.map((r) => ({
      clave: `srv:${r.id}`,
      reporteId: r.id,
      localId: null,
      fechaReporte: r.fecha_reporte,
      autor: r.reportado_por_nombre,
      actividadesCount: r.actividades_count,
      fotosCount: r.fotos_count,
      porEnviar: false,
      fallo: false,
      esAutor: usuarioId !== null && String(r.reportado_por) === usuarioId,
      // Del servidor: ya está ahí, así que solo falta que cierren las fotos.
      disponible: (r.fotos_pendientes ?? 0) === 0,
      intentosAgotados: false,
      errorMessage: null,
      createdAt: new Date(r.created_at),
    }));

    // Los pendientes primero — son los que piden acción — y el resto por fecha
    // descendente, que es como se consulta un historial.
    return {
      filas: [
        ...locales,
        ...remotos.sort((a, b) =>
          b.fechaReporte.localeCompare(a.fechaReporte) ||
          b.createdAt.getTime() - a.createdAt.getTime(),
        ),
      ],
      // Los de la cola se suman porque existen y se ven, aunque el servidor
      // todavía no los conozca.
      total: totalServidor + locales.length,
    };
  }, [consulta.data, reportesEnCola, constructionId, usuarioId]);

  /**
   * Trae la siguiente página. La llama la lista al llegar al final.
   *
   * Se protege de `isFetchingNextPage` aquí y no en la pantalla porque
   * `onEndReached` de `FlatList` dispara varias veces durante un mismo
   * arrastre: sin esto, un empujón al final pediría tres páginas.
   */
  const cargarMas = useCallback(() => {
    if (consulta.hasNextPage && !consulta.isFetchingNextPage) {
      void consulta.fetchNextPage();
    }
  }, [consulta]);

  /**
   * Trae lo nuevo SIN volver a bajar todo lo que ya se cargó.
   *
   * `refetch()` de una consulta infinita rebaja **todas** las páginas: con
   * cinco cargadas son cinco peticiones cada vez, en una app que trabaja con
   * señal intermitente. Como la lista va del más reciente al más viejo, lo
   * nuevo siempre entra por la primera página — así que se recorta a esa y se
   * vuelve a pedir solo ella: una petición, sin importar qué tan abajo haya
   * llegado el usuario.
   *
   * Lo que el usuario ya había cargado se descarta, y es correcto: el
   * historial viejo no cambia y vuelve a estar a un arrastre de distancia.
   */
  const refrescarDesdeArriba = useCallback(async () => {
    queryClient.setQueryData(llave, (viejo: typeof consulta.data) =>
      viejo
        ? {
            pages: viejo.pages.slice(0, 1),
            pageParams: viejo.pageParams.slice(0, 1),
          }
        : viejo,
    );
    await consulta.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, constructionId, consulta.refetch]);

  return { ...consulta, filas, total, cargarMas, refrescarDesdeArriba };
}

/** Detalle completo; alimenta el Documento en Miniatura en modo lectura. */
export function useReporteDetalle(reporteId: number | null) {
  return useQuery({
    queryKey: [REPORTE_QUERY_KEYS.REPORTE_DETALLE, reporteId],
    queryFn: () => getReporteDetalle(reporteId as number),
    enabled: reporteId !== null,
  });
}

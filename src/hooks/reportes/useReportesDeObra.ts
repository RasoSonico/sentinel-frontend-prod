import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  getReporteDetalle,
  getReportesPorObra,
} from "src/modules/reportes/services/reporteService";
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
  createdAt: Date;
}

export function useReportesDeObra(constructionId: number | null) {
  const consulta = useQuery({
    queryKey: [REPORTE_QUERY_KEYS.REPORTES_POR_OBRA, constructionId],
    queryFn: () => getReportesPorObra(constructionId as number),
    enabled: constructionId !== null,
  });

  const { reportesEnCola } = usePendingReporteQueue();

  const filas = useMemo<FilaReporte[]>(() => {
    const crudo = consulta.data;
    const delServidor: ReporteListItem[] = Array.isArray(crudo)
      ? crudo
      : (crudo?.results ?? []);

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
      // Del servidor: ya está ahí, así que solo falta que cierren las fotos.
      disponible: (r.fotos_pendientes ?? 0) === 0,
      intentosAgotados: false,
      errorMessage: null,
      createdAt: new Date(r.created_at),
    }));

    // Los pendientes primero — son los que piden acción — y el resto por fecha
    // descendente, que es como se consulta un historial.
    return [
      ...locales,
      ...remotos.sort((a, b) =>
        b.fechaReporte.localeCompare(a.fechaReporte) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    ];
  }, [consulta.data, reportesEnCola, constructionId]);

  return { ...consulta, filas };
}

/** Detalle completo; alimenta el Documento en Miniatura en modo lectura. */
export function useReporteDetalle(reporteId: number | null) {
  return useQuery({
    queryKey: [REPORTE_QUERY_KEYS.REPORTE_DETALLE, reporteId],
    queryFn: () => getReporteDetalle(reporteId as number),
    enabled: reporteId !== null,
  });
}

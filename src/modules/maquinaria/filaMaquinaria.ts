import type { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import type { PendingMaquinariaSubmission } from "src/realm/pendingMaquinaria/PendingMaquinariaSubmission";

/**
 * Una fila del hub, venga del servidor o de la cola local.
 *
 * El hub lo arma el servidor, así que una máquina dada de alta sin señal **no
 * aparece en ninguna parte**: el supervisor la registra, la pantalla no cambia,
 * y no tiene a qué reportarle la jornada. Esta forma común es lo que permite
 * pintar las dos en la misma lista con la misma tarjeta.
 *
 * Los nombres de campo son los del servidor a propósito: así un
 * `MaquinariaHubItemRealm` la satisface **estructuralmente**, sin conversión ni
 * copia, y solo las locales pagan el mapeo.
 */
/**
 * Un renglón tal como lo ve la lista, venga de Realm o de un arreglo normal.
 *
 * Se declara aparte porque los dos orígenes traen contenedores distintos: el
 * caché del hub entrega una `Realm.List` y la cola local un arreglo. Tipar el
 * campo como `ArrayLike` obliga a `Array.from(...)` en el consumidor, que es
 * lo único que funciona con los dos — y además impide guardarse una referencia
 * viva de Realm, que es como se nos coló un defecto antes.
 */
export interface DetalleFila {
  orden: number;
  concept: number | null;
  descripcion: string;
  horas_estimadas: string | null;
}

export interface FilaMaquinaria {
  id: number;
  tipo: string;
  marca: string;
  modelo: string;
  propietario_tipo: string;
  tipo_permanencia: string;
  /** 0 mientras la máquina viva solo en el teléfono. */
  estancia_id: number;
  jornada_id: number | null;
  jornada_estado: string | null;
  jornada_motivo_inactividad: string | null;
  /** Lo que hizo hoy. Vacío si no se ha reportado o si no operó. */
  jornada_detalles: ArrayLike<DetalleFila>;
  /**
   * Las lecturas de HOY, para la tabla de maquinaria del reporte. No
   * confundir con `ultimo_horometro`, que es la referencia de cualquier día
   * anterior contra la que se captura.
   */
  jornada_horometro_inicial: string | null;
  jornada_horometro_final: string | null;
  requiere_reconciliacion: boolean;
  dias_sin_reporte: number;
  ultimo_horometro: string | null;
  ultimo_horometro_fecha: string | null;
  /**
   * El último día que esta máquina trabajó de verdad, con lo que hizo. Es lo
   * que copia "Repetir"; `null` si nunca ha trabajado antes de hoy.
   */
  ultima_jornada_trabajada_fecha: string | null;
  ultima_jornada_trabajada_detalles: ArrayLike<DetalleFila>;
  /**
   * `_id` del alta en cola cuando la máquina todavía no existe en el servidor.
   *
   * Es lo que la jornada guarda en lugar del `estanciaId` que aún no hay. Con
   * él, el worker sabe a qué alta esperar para reescribir el enlace.
   */
  maquinariaLocalId: string | null;
}

/**
 * Copia PLANA de una fila, desligada de Realm.
 *
 * **Obligatoria antes de guardar una fila en estado de React.** Las del
 * servidor son objetos VIVOS de Realm: `filaDeServidor` no copia nada, declara
 * un parentesco. Eso está bien para pintar una lista que se vuelve a renderizar
 * cuando el dato cambia, y está MAL para guardarlas.
 *
 * Cuando el hub refresca, el caché se reescribe con `UpdateMode.Modified` y los
 * objetos embebidos anteriores **se borran**. Cualquiera que siguiera
 * apuntándolos revienta con "Accessing object which has been invalidated or
 * deleted" —o con "Cannot access realm that has been closed" si además el
 * provider se reinició—, y la pantalla se queda en gris.
 *
 * Es justo lo que le pasaba a la hoja de jornada: guardaba la fila elegida y el
 * siguiente refresco se la borraba debajo.
 */
export const congelarFila = (fila: FilaMaquinaria): FilaMaquinaria => ({
  id: fila.id,
  tipo: fila.tipo,
  marca: fila.marca,
  modelo: fila.modelo,
  propietario_tipo: fila.propietario_tipo,
  tipo_permanencia: fila.tipo_permanencia,
  estancia_id: fila.estancia_id,
  jornada_id: fila.jornada_id,
  jornada_estado: fila.jornada_estado,
  jornada_motivo_inactividad: fila.jornada_motivo_inactividad,
  jornada_detalles: Array.from(fila.jornada_detalles).map(congelarDetalle),
  jornada_horometro_inicial: fila.jornada_horometro_inicial,
  jornada_horometro_final: fila.jornada_horometro_final,
  requiere_reconciliacion: fila.requiere_reconciliacion,
  dias_sin_reporte: fila.dias_sin_reporte,
  ultimo_horometro: fila.ultimo_horometro,
  ultimo_horometro_fecha: fila.ultimo_horometro_fecha,
  ultima_jornada_trabajada_fecha: fila.ultima_jornada_trabajada_fecha,
  ultima_jornada_trabajada_detalles: Array.from(
    fila.ultima_jornada_trabajada_detalles,
  ).map(congelarDetalle),
  maquinariaLocalId: fila.maquinariaLocalId,
});

const congelarDetalle = (d: DetalleFila): DetalleFila => ({
  orden: d.orden,
  concept: d.concept,
  descripcion: d.descripcion,
  horas_estimadas: d.horas_estimadas,
});

/** Las del servidor ya tienen la forma: solo se declara el parentesco. */
export const filaDeServidor = (
  item: MaquinariaHubItemRealm,
): FilaMaquinaria => item as unknown as FilaMaquinaria;

/**
 * Las locales se mapean, y varias cosas se dejan en cero a propósito:
 *
 * - `id` toma el del servidor **en cuanto el alta se sincroniza**, aunque la
 *   fila se siga pintando como local hasta que el hub la traiga. De eso
 *   depende que la llave de la lista no cambie en la transición: si cambiara,
 *   React no vería "la misma fila actualizada" sino una que muere y otra que
 *   nace, y el supervisor vería desaparecer y reaparecer su máquina.
 * - `estancia_id` en 0 mientras no exista. Inventar un id negativo o un
 *   placeholder sería peor: alguien acabaría mandándolo.
 * - `requiere_reconciliacion` en false y `dias_sin_reporte` en 0 porque esos
 *   cálculos son del servidor y sobre una máquina que acaba de llegar no
 *   significan nada.
 * - `ultimo_horometro` y la última jornada trabajada en nulo o vacío: no hay
 *   día anterior contra el cual comparar, ni nada que repetir.
 */
export const filaDeCola = (alta: PendingMaquinariaSubmission): FilaMaquinaria => ({
  id: alta.maquinariaId ?? 0,
  tipo: alta.tipoNombre,
  marca: alta.marca,
  modelo: alta.modelo,
  propietario_tipo: alta.propietarioTipo,
  tipo_permanencia: alta.tipoPermanencia,
  estancia_id: 0,
  jornada_id: null,
  jornada_estado: null,
  jornada_motivo_inactividad: null,
  jornada_detalles: [],
  jornada_horometro_inicial: null,
  jornada_horometro_final: null,
  requiere_reconciliacion: false,
  dias_sin_reporte: 0,
  ultimo_horometro: null,
  ultimo_horometro_fecha: null,
  ultima_jornada_trabajada_fecha: null,
  ultima_jornada_trabajada_detalles: [],
  maquinariaLocalId: alta._id,
});

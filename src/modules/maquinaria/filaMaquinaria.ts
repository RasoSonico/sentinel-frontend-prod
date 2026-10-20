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
  requiere_reconciliacion: boolean;
  dias_sin_reporte: number;
  ultimo_horometro: string | null;
  ultimo_horometro_fecha: string | null;
  /**
   * `_id` del alta en cola cuando la máquina todavía no existe en el servidor.
   *
   * Es lo que la jornada guarda en lugar del `estanciaId` que aún no hay. Con
   * él, el worker sabe a qué alta esperar para reescribir el enlace.
   */
  maquinariaLocalId: string | null;
}

/** Las del servidor ya tienen la forma: solo se declara el parentesco. */
export const filaDeServidor = (
  item: MaquinariaHubItemRealm,
): FilaMaquinaria => item as unknown as FilaMaquinaria;

/**
 * Las locales se mapean, y varias cosas se dejan en cero a propósito:
 *
 * - `id` y `estancia_id` en 0 porque **no existen todavía**. Inventar un id
 *   negativo o un placeholder sería peor: alguien acabaría mandándolo.
 * - `requiere_reconciliacion` en false y `dias_sin_reporte` en 0 porque esos
 *   cálculos son del servidor y sobre una máquina que acaba de llegar no
 *   significan nada.
 * - `ultimo_horometro` en null: no hay día anterior contra el cual comparar.
 */
export const filaDeCola = (alta: PendingMaquinariaSubmission): FilaMaquinaria => ({
  id: 0,
  tipo: alta.tipoNombre,
  marca: alta.marca,
  modelo: alta.modelo,
  propietario_tipo: alta.propietarioTipo,
  tipo_permanencia: alta.tipoPermanencia,
  estancia_id: 0,
  jornada_id: null,
  jornada_estado: null,
  jornada_motivo_inactividad: null,
  requiere_reconciliacion: false,
  dias_sin_reporte: 0,
  ultimo_horometro: null,
  ultimo_horometro_fecha: null,
  maquinariaLocalId: alta._id,
});

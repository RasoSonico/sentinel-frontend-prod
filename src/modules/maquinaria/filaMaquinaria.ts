import type { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import type { PendingMaquinariaSubmission } from "src/realm/pendingMaquinaria/PendingMaquinariaSubmission";

import type { MaquinaServidor } from "./diaMaquina";

/**
 * Una máquina de la lista, venga del hub o de la cola de altas, en la forma
 * que `construirVista` sabe fundir con las capturas.
 *
 * El hub lo arma el servidor, así que una máquina dada de alta sin señal **no
 * aparece en ninguna parte**: el supervisor la registra y no tiene a qué
 * reportarle la jornada. Esta forma común es lo que permite pintar las dos en
 * la misma lista con la misma tarjeta.
 *
 * **Nadie guarda una `FilaMaquinaria` en estado de React.** Las del servidor
 * son objetos VIVOS de Realm: cuando el hub refresca, el caché se reescribe y
 * los embebidos anteriores se borran, y cualquiera que los siguiera
 * apuntando revienta con "Accessing object which has been invalidated". La
 * hoja guarda la LLAVE de la máquina y recalcula la vista —que sí es plana— en
 * cada render.
 */
export type FilaMaquinaria = MaquinaServidor;

/**
 * Las del servidor ya tienen la forma: solo se declara el parentesco y se
 * agrega el `maquinariaLocalId` que el hub no conoce.
 */
export const filaDeServidor = (item: MaquinariaHubItemRealm): FilaMaquinaria => ({
  id: item.id,
  tipo: item.tipo,
  marca: item.marca,
  modelo: item.modelo,
  propietario_tipo: item.propietario_tipo,
  estancia_id: item.estancia_id,
  maquinariaLocalId: null,
  jornada_hoy: item.jornada_hoy,
  turno_abierto: item.turno_abierto,
  jornada_turno_abierto: item.jornada_turno_abierto,
  requiere_atencion: item.requiere_atencion,
  dias_sin_reporte: item.dias_sin_reporte,
  ultimo_horometro: item.ultimo_horometro,
  ultimo_horometro_fecha: item.ultimo_horometro_fecha,
  ultima_jornada_trabajada_fecha: item.ultima_jornada_trabajada_fecha,
  ultima_jornada_trabajada_detalles: item.ultima_jornada_trabajada_detalles,
});

/**
 * Las locales nacen vacías, y varias cosas se dejan en cero a propósito:
 *
 * - `id` toma el del servidor **en cuanto el alta se sincroniza**, aunque la
 *   fila se siga pintando como local hasta que el hub la traiga. De eso
 *   depende que la llave de la lista no cambie en la transición.
 * - `estancia_id` en 0 mientras no exista, y el real en cuanto el alta lo
 *   devuelve: desde ese momento las capturas de la máquina ya cuelgan de
 *   esa estancia, y la fila tiene que encontrarlas ahí. Inventar un id
 *   mientras tanto sería peor: alguien acabaría mandándolo.
 * - Sin horómetro previo, sin reconciliación y sin nada que repetir: sobre
 *   una máquina que acaba de llegar, esos cálculos no significan nada.
 */
export const filaDeCola = (alta: PendingMaquinariaSubmission): FilaMaquinaria => ({
  id: alta.maquinariaId ?? 0,
  tipo: alta.tipoNombre,
  marca: alta.marca,
  modelo: alta.modelo,
  propietario_tipo: alta.propietarioTipo,
  estancia_id: alta.estanciaId ?? 0,
  maquinariaLocalId: alta._id,
  jornada_hoy: null,
  turno_abierto: null,
  jornada_turno_abierto: null,
  requiere_atencion: null,
  dias_sin_reporte: 0,
  ultimo_horometro: null,
  ultimo_horometro_fecha: null,
  ultima_jornada_trabajada_fecha: null,
  ultima_jornada_trabajada_detalles: [],
});

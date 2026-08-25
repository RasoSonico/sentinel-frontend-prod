/**
 * Programa contractual vigente de un catálogo (ADR-003 §8.1 backend, ADR-004 D6).
 *
 * Viaja dentro del paquete `avance/base/` — no por un endpoint aparte — porque
 * duplicar el canal crearía dos fuentes de verdad sobre las mismas tablas. El
 * escritor del programa es el escritorio, así que NINGÚN worker del dispositivo
 * lo invalida: se refresca con el prefetch (login, pull-to-refresh, reconexión).
 *
 * TODOS los decimales van como `string`, igual que en AvanceBaseConcept: Realm
 * no tiene decimal nativo y guardarlos como `double` perdería la precisión de
 * 4 decimales que el backend garantiza. Se convierten con `parseNum` al
 * construir el árbol.
 */

/** Un punto de la serie: acumulado programado a una fecha de corte. */
export class ProgramaCorte extends Realm.Object<ProgramaCorte> {
  fecha_corte!: string;
  volumen_acumulado!: string;

  static schema: Realm.ObjectSchema = {
    name: "ProgramaCorte",
    embedded: true,
    properties: {
      fecha_corte: "string",
      volumen_acumulado: "string",
    },
  };
}

/**
 * Una fila de programa con su serie. `concept_id` y `work_item_id` son
 * excluyentes: el indicador se pinta SOLO en el nivel donde el programa existe,
 * sin prorratear nunca hacia abajo (D4).
 */
export class ProgramaConceptoRealm extends Realm.Object<ProgramaConceptoRealm> {
  concept_id!: number | null;
  work_item_id!: number | null;
  fecha_inicio!: string;
  fecha_fin!: string;
  volumen_total!: string;
  cortes!: Realm.List<ProgramaCorte>;

  static schema: Realm.ObjectSchema = {
    name: "ProgramaConceptoRealm",
    embedded: true,
    properties: {
      concept_id: "int?",
      work_item_id: "int?",
      fecha_inicio: "string",
      fecha_fin: "string",
      volumen_total: "string",
      cortes: { type: "list", objectType: "ProgramaCorte" },
    },
  };
}

/**
 * Bloque `programa` del catálogo: solo la versión VIGENTE.
 *
 * `version_id` y `numero_version` funcionan como stamp auditable — la UI puede
 * mostrar "programa v3 · cargado 12-jul".
 */
export class Programa extends Realm.Object<Programa> {
  version_id!: number;
  numero_version!: number;
  fecha_carga!: string;
  conceptos!: Realm.List<ProgramaConceptoRealm>;

  static schema: Realm.ObjectSchema = {
    name: "Programa",
    embedded: true,
    properties: {
      version_id: "int",
      numero_version: "int",
      fecha_carga: "string",
      conceptos: { type: "list", objectType: "ProgramaConceptoRealm" },
    },
  };
}

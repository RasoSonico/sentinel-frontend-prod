export type PropietarioTipo = "PROPIA" | "RENTADA" | "SUBCONTRATISTA";
export type TipoPermanencia = "RESIDENTE" | "TRANSITORIA";
export type TipoSalida = "TEMPORAL" | "DEFINITIVA";
export type MotivoSalida =
  | "TERMINO_ALCANCE"
  | "FIN_RENTA"
  | "FALLA_MECANICA"
  | "REUBICADA"
  | "YA_NO_REQUERIDA"
  | "OTRO";
export type EstadoJornada = "TRABAJANDO" | "SIN_OPERAR";
export type MotivoInactividad =
  | "FALLA_MECANICA"
  | "SIN_OPERADOR"
  | "SIN_FRENTE"
  | "CLIMA"
  | "OTRO";
export type ResultadoRecon =
  | "SIGUE_EN_OBRA"
  | "SALIO"
  | "EN_REPARACION"
  | "POSPUESTO";

export interface TipoMaquinaria {
  id: number;
  nombre: string;
  is_active: boolean;
}

export interface MaquinariaItem {
  id: number;
  construction: number;
  tipo: number;
  tipo_nombre: string;
  marca: string;
  modelo: string;
  propietario_tipo: PropietarioTipo;
  tipo_permanencia: TipoPermanencia;
  created_at: string;
}

export interface CreateMaquinariaBody {
  construction: number;
  tipo: number;
  marca: string;
  modelo: string;
  propietario_tipo: PropietarioTipo;
  tipo_permanencia: TipoPermanencia;
  fecha_ingreso: string;
  client_id?: string;
}

/**
 * Respuesta del alta: la máquina **y la estancia que se le abrió**.
 *
 * El `estancia_id` es lo que cierra el círculo de la cola offline. El alta
 * crea las dos cosas en una transacción, y sin ese id una jornada capturada
 * contra una máquina dada de alta sin señal no sabría a qué colgarse.
 */
export interface AltaMaquinariaResponse extends MaquinariaItem {
  estancia_id: number | null;
  client_id: string | null;
}

export interface EstanciaResponse {
  id: number;
  maquinaria: number;
  fecha_ingreso: string;
  fecha_salida?: string | null;
  tipo_salida?: TipoSalida | null;
  motivo_salida?: MotivoSalida | null;
  detalle_motivo_salida?: string;
  created_at: string;
}

export interface CreateEstanciaBody {
  maquinaria: number;
  fecha_ingreso: string;
}

export interface CloseEstanciaBody {
  fecha_salida: string;
  tipo_salida: TipoSalida;
  motivo_salida: MotivoSalida;
  detalle_motivo_salida: string;
}

/**
 * Un renglón de lo que hizo la máquina, como lo devuelve el servidor.
 *
 * `concept` **ó** `descripcion`: una actividad es un concepto del catálogo o
 * un texto escrito a mano, nunca las dos vacías. El catálogo no viaja porque
 * se deduce del concepto.
 */
export interface DetalleJornada {
  orden: number;
  concept: number | null;
  descripcion: string;
  /**
   * El reparto que hace el supervisor **a ojo** del total del horómetro.
   *
   * Cadena, no número, por lo mismo que el horómetro: el servidor la manda
   * así y el flotante perdería décimas. Es percepción, no medición —pero eso
   * no la vuelve menos merecedora de llegar intacta—.
   */
  horas_estimadas: string | null;
}

/**
 * Un renglón como se ENVÍA.
 *
 * `concept_id`, no `concept`: el servidor lee y escribe con nombres distintos
 * para este campo. El `orden` **no viaja** — lo asigna el servidor según la
 * posición en el arreglo, para que dos renglones no puedan pelearse el mismo
 * número.
 */
export interface DetalleEntrada {
  concept_id?: number | null;
  descripcion?: string;
  horas_estimadas?: string | null;
}

export interface JornadaResponse {
  id: number;
  estancia: number;
  fecha: string;
  estado: EstadoJornada;
  motivo_inactividad: MotivoInactividad | null;
  observaciones: string;
  /** Vacío cuando la jornada es SIN_OPERAR. */
  detalles: DetalleJornada[];
  /**
   * Lecturas del horómetro. Llegan como cadena porque DRF serializa
   * `DecimalField` así, y convertirlas a `number` perdería la décima en los
   * valores que el flotante no representa exacto.
   */
  horometro_inicial: string | null;
  horometro_final: string | null;
  /** Derivado en el servidor: `final - inicial`. Null si falta una lectura. */
  horas_maquina: string | null;
  client_id: string | null;
  reportado_por: number;
  created_at: string;
}

export interface CreateJornadaTrabajandoBody {
  estancia: number;
  fecha: string;
  estado: "TRABAJANDO";
  /** Al menos una. El servidor rechaza una jornada TRABAJANDO sin renglones. */
  detalles: DetalleEntrada[];
  observaciones?: string;
  /** Opcionales y no van en pareja: ver `Jornada` en el backend. */
  horometro_inicial?: string | null;
  horometro_final?: string | null;
  /**
   * Clave de idempotencia, acuñada al ENCOLAR. Un segundo POST con la misma
   * devuelve la jornada existente con 200 en vez de duplicarla.
   */
  client_id?: string;
}

export interface CreateJornadaSinOperarBody {
  estancia: number;
  fecha: string;
  estado: "SIN_OPERAR";
  motivo_inactividad: MotivoInactividad;
  observaciones?: string;
  horometro_inicial?: string | null;
  horometro_final?: string | null;
  client_id?: string;
}

export type CreateJornadaBody =
  | CreateJornadaTrabajandoBody
  | CreateJornadaSinOperarBody;

export interface CreateReconciliacionSigueBody {
  estancia_id: number;
  resultado: "SIGUE_EN_OBRA" | "POSPUESTO";
}

export interface CreateReconciliacionSalioBody {
  estancia_id: number;
  resultado: "SALIO";
  fecha_salida_indicada: string;
}

export interface CreateReconciliacionReparacionBody {
  estancia_id: number;
  resultado: "EN_REPARACION";
}

export type CreateReconciliacionBody =
  | CreateReconciliacionSigueBody
  | CreateReconciliacionSalioBody
  | CreateReconciliacionReparacionBody;

export interface ReconciliacionResponse {
  id: number;
  resultado: ResultadoRecon;
}

export interface HubResumen {
  total_en_sitio: number;
  reportadas_hoy: number;
  sin_reportar: number;
  sin_operar: number;
}

export interface JornadaHoy {
  id: number;
  estado: EstadoJornada;
  motivo_inactividad: MotivoInactividad | null;
  observaciones: string;
  /**
   * Las dos lecturas del día, como CADENA.
   *
   * No son para la tarjeta del hub, que no las muestra: son para la tabla de
   * maquinaria del reporte, que las imprime junto con las horas derivadas. Y
   * viajan en el hub —lo único que se cachea— porque el reporte se arma en
   * obra: lo que no esté aquí no se puede previsualizar sin señal.
   */
  horometro_inicial: string | null;
  horometro_final: string | null;
  /** Vacío cuando SIN_OPERAR. */
  detalles: DetalleJornada[];
}

/**
 * El último día que la máquina **de verdad trabajó**, con todo lo que hizo.
 *
 * Es lo que alimenta "Repetir lo del {fecha} · {N}". No es "ayer": las obras
 * no tienen horario fijo, así que el servidor busca la última jornada
 * TRABAJANDO anterior a hoy, sea de cuando sea. La fecha viaja para que el
 * botón pueda decir de cuándo viene lo que va a copiar.
 */
export interface UltimaJornadaTrabajada {
  fecha: string;
  detalles: DetalleJornada[];
}

export interface EstanciaActual {
  id: number;
  fecha_ingreso: string;
}

export interface MaquinariaHubItem {
  id: number;
  tipo: string;
  marca: string;
  modelo: string;
  propietario_tipo: PropietarioTipo;
  tipo_permanencia: TipoPermanencia;
  estancia_actual: EstanciaActual;
  jornada_hoy: JornadaHoy | null;
  requiere_reconciliacion: boolean;
  dias_sin_reporte: number;
  ultima_jornada_fecha: string | null;
  /**
   * Última lectura de cierre del horómetro que EXISTE para esta estancia, con
   * la fecha en que se tomó.
   *
   * Viaja en el hub —y por lo tanto queda en el caché de Realm— para que la
   * pantalla de captura pueda comparar contra ella sin pedir nada por red.
   * Importa porque se captura en obra, que es donde no hay señal.
   *
   * La fecha viene aparte a propósito: "cierre de ayer" sería mentira en una
   * máquina que lleva tres días sin reportarse.
   */
  ultimo_horometro: string | null;
  ultimo_horometro_fecha: string | null;
  /** `null` si la máquina nunca ha tenido una jornada trabajada previa. */
  ultima_jornada_trabajada: UltimaJornadaTrabajada | null;
}

export interface HubDiarioResponse {
  fecha: string;
  resumen: HubResumen;
  maquinarias: MaquinariaHubItem[];
}

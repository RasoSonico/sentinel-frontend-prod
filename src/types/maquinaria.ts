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
   * así y el flotante perdería décimas.
   */
  horas_estimadas: string | null;
  /**
   * Cuándo se registró, en ISO con el desplazamiento de la obra. Vale la hora
   * en que se guarda: no se pide la de ejecución (ADR-009).
   */
  registrado_en: string | null;
  /** "J. Pérez". */
  autor: string | null;
}

/**
 * Un renglón como se ENVÍA.
 *
 * `concept_id`, no `concept`: el servidor lee y escribe con nombres distintos
 * para este campo. El `orden` **no viaja**: el servidor lo continúa a partir
 * del último renglón de la jornada.
 */
export interface DetalleEntrada {
  concept_id?: number | null;
  descripcion?: string;
  horas_estimadas?: string | null;
}

/**
 * Una lectura inicial y una final del horómetro (backend B2).
 *
 * El horómetro se lee por turno, no por día: puede haber otro turno después
 * del cierre, o uno nocturno que cruza la medianoche. El turno es de la
 * jornada del día en que EMPIEZA.
 */
export interface TurnoJornada {
  id: number;
  inicial: string | null;
  final: string | null;
  /** `final − inicial`, sin acotar a cero. Null si falta una. */
  horas: string | null;
  desde: string;
  hasta: string | null;
  autor_inicio: string | null;
  autor_cierre: string | null;
  /** Cierre olvidado resuelto con "Dejarlo sin final". */
  cerrado_sin_final: boolean;
}

/**
 * La jornada completa, con la misma forma en el hub y en la respuesta de
 * `POST /capturas/`.
 */
export interface JornadaCompleta {
  id: number;
  fecha: string;
  /** Null mientras no se haya reportado: el arranque no reporta. */
  estado: EstadoJornada | null;
  motivo_inactividad: MotivoInactividad | null;
  observaciones: string;
  turnos: TurnoJornada[];
  /** Suma de los turnos completos. Null si ninguno lo está. */
  horas_maquina: string | null;
  detalles: DetalleJornada[];
}

/** El turno sin final de una máquina, sea del día que sea. */
export interface TurnoAbierto {
  id: number;
  jornada_fecha: string;
  inicial: string | null;
  desde: string;
  /**
   * Cuándo pasa de "en curso" a "cierre olvidado". Lo calcula el servidor
   * con su umbral, para que el teléfono no tenga que conocer el número.
   */
  olvidado_en: string;
}

/**
 * `POST /capturas/` — lo que el usuario guardó de una vez (backend B4).
 *
 * El servidor decide a qué jornada va cada cosa; el cliente nunca necesita un
 * id de jornada, y por eso puede seguir capturando sin señal.
 */
export interface CreateCapturaBody {
  /** Clave de idempotencia, acuñada al ENCOLAR. */
  client_id: string;
  estancia: number;
  /** Fecha LOCAL del teléfono al guardar. */
  fecha: string;
  /** Hora del teléfono al guardar: la captura puede subir horas después. */
  registrado_en: string;
  horometro_inicial?: string | null;
  horometro_final?: string | null;
  /** Resolver un cierre olvidado. Viaja SOLO, sin nada más. */
  cerrar_anterior?: { final: string } | { sin_final: true } | null;
  estado?: "SIN_OPERAR" | null;
  motivo_inactividad?: MotivoInactividad | null;
  observaciones?: string;
  detalles?: DetalleEntrada[];
}

/** El 409 de `POST /capturas/`: choca con el estado de la máquina. */
export interface ConflictoCaptura {
  detail: string;
  motivo: "SIN_FINAL" | "TURNO_ABIERTO";
  turno_abierto: TurnoAbierto | null;
}

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

/**
 * `reportadas = trabajando + no_opero`. El arranque no reporta. El cliente
 * le suma lo que tenga en cola.
 */
export interface HubResumen {
  total: number;
  reportadas: number;
  trabajando: number;
  no_opero: number;
  sin_reportar: number;
}

export type EstadoDia = "SIN_REPORTAR" | "TRABAJANDO" | "NO_OPERO";

export interface RequiereAtencion {
  motivo: "SIN_FINAL" | "RECONCILIACION";
}

/**
 * El último día que la máquina **de verdad trabajó**, con todo lo que hizo.
 * Alimenta "Repetir lo del {fecha} · {N}".
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
  /** Del día que se pidió, según el servidor. El cliente lo funde con la cola. */
  estado_dia: EstadoDia;
  actividades_hoy: number;
  falta_horometro: boolean;
  jornada_hoy: JornadaCompleta | null;
  turno_abierto: TurnoAbierto | null;
  /** La jornada del turno abierto cuando no es la de hoy (el nocturno). */
  jornada_turno_abierto: JornadaCompleta | null;
  requiere_atencion: RequiereAtencion | null;
  dias_sin_reporte: number;
  ultima_jornada_fecha: string | null;
  /**
   * Último final de turno con valor, y de qué día. Viaja en el hub —y por lo
   * tanto en el caché de Realm— para sugerir el inicial sin red.
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

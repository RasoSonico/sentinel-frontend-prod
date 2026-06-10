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

export interface JornadaResponse {
  id: number;
  estancia: number;
  catalog: number | null;
  concept: number | null;
  fecha: string;
  estado: EstadoJornada;
  motivo_inactividad: MotivoInactividad | null;
  observaciones: string;
  reportado_por: number;
  created_at: string;
}

export interface CreateJornadaTrabajandoBody {
  estancia: number;
  fecha: string;
  estado: "TRABAJANDO";
  catalog: number;
  concept?: number | null;
  observaciones?: string;
}

export interface CreateJornadaSinOperarBody {
  estancia: number;
  fecha: string;
  estado: "SIN_OPERAR";
  motivo_inactividad: MotivoInactividad;
  observaciones?: string;
}

export type CreateJornadaBody =
  | CreateJornadaTrabajandoBody
  | CreateJornadaSinOperarBody;

export interface CreateJornadaTransitoriaBody {
  maquinaria_id: number;
  catalog_id: number;
  concept_id?: number | null;
  fecha: string;
  observaciones?: string;
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

export interface HubResumen {
  total_en_sitio: number;
  reportadas_hoy: number;
  sin_reportar: number;
  sin_operar: number;
}

export interface JornadaHoy {
  id: number;
  estado: EstadoJornada;
  catalog: number | null;
  concept: number | null;
  motivo_inactividad: MotivoInactividad | null;
  observaciones: string;
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
}

export interface HubDiarioResponse {
  fecha: string;
  resumen: HubResumen;
  maquinarias: MaquinariaHubItem[];
}

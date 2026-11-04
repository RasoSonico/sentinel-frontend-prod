/**
 * Contratos del reporte de actividades diario (UIN-RP-F-002).
 *
 * Espejo de lo que sirve `reportes/serializers.py` en el backend (ADR-004).
 * Los nombres de campo se conservan en snake_case tal como llegan: renombrarlos
 * en el borde obligaría a mantener un mapeo que se desincroniza en silencio la
 * primera vez que el backend agregue un campo.
 */

import type { AreaReporte } from "src/modules/reportes/constantes";
import type { Geometria } from "src/modules/firma/trazo";

export type TipoProveedor = "CONTRATISTA" | "SUPERVISION";

export interface Proveedor {
  id: number;
  nombre: string;
  tipo: TipoProveedor;
}

// ── Escritura ──────────────────────────────────────────────────────────────

export interface ActividadPayload {
  orden: number;
  texto: string;
  /**
   * Dónde ocurrió, en las palabras de la obra. Cadena vacía cuando no aplica.
   *
   * El servidor las acepta ausentes o vacías —significan lo mismo— pero aquí
   * van siempre, para que el payload de la cola tenga una sola forma: una
   * fila encolada puede salir días después, y adivinar qué versión la
   * escribió sería trabajo para nadie.
   */
  zona: string;
  frente: string;
}

export interface FotoPayload {
  orden: number;
  pie: string;
  filename: string;
  content_type?: string;
  taken_at?: string | null;
  device_model?: string | null;
}

export interface ReportePayload {
  /**
   * `proveedor_ids` lleva contratistas Y supervisión en una sola lista: es lo
   * que el usuario palomeó en P-00. El servidor los clasifica por el `tipo`
   * del catálogo, que es el único lugar donde ese dato es autoridad.
   */
  /** UUID acuñado al ENCOLAR. Es la clave de idempotencia del POST. */
  client_id: string;
  construction: number;
  /** Especialidad que reporta. Se imprime en sección propia del documento. */
  area: AreaReporte;
  /** `YYYY-MM-DD` en día LOCAL; nunca `toISOString().split("T")[0]`. */
  fecha_reporte: string;
  conclusion: string;
  actividades: ActividadPayload[];
  fotos: FotoPayload[];
  proveedor_ids: number[];
  /**
   * La firma de quien cierra. **Obligatoria en el documento**, opcional en el
   * payload: si no viene, el servidor usa la del perfil de quien hace la
   * petición. Se manda siempre de todos modos — ver `firmaJson` en la cola.
   */
  firma?: FirmaPayload;
}

/**
 * Geometría del trazo. Coordenadas de la caja de captura, origen arriba-izq.
 *
 * **Alias y no una interfaz propia.** El tipo canónico vive con el código que
 * dibuja (`src/modules/firma/trazo.ts`), que es el que tiene que coincidir con
 * el backend punto por punto. Declararlo otra vez aquí sería tener dos
 * definiciones de la misma cosa, y la segunda que se quede atrás se descubre
 * cuando una firma sale deformada en un documento ya entregado.
 */
export type FirmaPayload = Geometria;

// ── Lectura ────────────────────────────────────────────────────────────────

export interface ActividadReporte {
  id: number;
  orden: number;
  texto: string;
  /** Opcionales en el servidor; ausentes en reportes creados antes de F52. */
  zona?: string;
  frente?: string;
}

export interface FotoReporte {
  id: number;
  orden: number;
  pie: string;
  subida: boolean;
  ancho_px: number;
  alto_px: number;
  taken_at: string | null;
  /** SAS de lectura; `null` mientras la foto no ha subido. */
  thumbnail_url: string | null;
  url: string | null;
}

export interface ParticipanteReporte {
  id: number;
  nombre: string;
  tipo: TipoProveedor;
}

/**
 * Una máquina del día, **copiada** al reporte al emitirlo.
 *
 * El supervisor no la captura en el reporte: sale de lo que reportó en la tab
 * de Maquinaria. Se copia y no se referencia, para que el documento siga
 * diciendo lo que decía aunque la ficha de la máquina cambie después.
 *
 * Las lecturas viajan como CADENA —un `Decimal` perdería la décima al pasar
 * por flotante— y las horas NO viajan: se derivan de las dos lecturas. Un
 * tercer número que pudiera no cuadrar con los otros dos haría que ninguno
 * sirviera como evidencia.
 */
export interface MaquinariaReporte {
  orden: number;
  /** "Retroexcavadora JCB 3CX", ya compuesto por el servidor. */
  equipo: string;
  estado: "TRABAJANDO" | "SIN_OPERAR";
  /** Vacío cuando trabajó. */
  motivo_inactividad: string;
  horometro_inicial: string | null;
  horometro_final: string | null;
  /** Suma de los turnos completos. Ausente en reportes cacheados de antes. */
  horas?: string | null;
  actividades: {
    orden: number;
    texto: string;
    horas_estimadas: string | null;
  }[];
}

export interface ReporteListItem {
  id: number;
  client_id: string;
  fecha_reporte: string;
  construction: number;
  area: AreaReporte;
  /** Etiqueta ya resuelta por el servidor: "Seguridad e Higiene". */
  area_display: string;
  reportado_por: number;
  reportado_por_nombre: string;
  actividades_count: number;
  fotos_count: number;
  /** Declaradas que aún no confirman subida. Mientras sea > 0, no se genera. */
  fotos_pendientes: number;
  created_at: string;
}

export interface ReporteDetalle extends ReporteListItem {
  conclusion: string;
  actividades: ActividadReporte[];
  fotos: FotoReporte[];
  participantes: ParticipanteReporte[];
  /** Congelada al emitir. Vacía si ese día no reportó ninguna máquina. */
  maquinaria: MaquinariaReporte[];
  /**
   * Espejo de la condición del 409 del backend: `false` mientras queden fotos
   * declaradas sin subir. Permite apagar los botones de Generar ANTES de pedir
   * el archivo, en vez de descubrirlo con un error. La autoridad sigue siendo
   * el endpoint de archivo.
   */
  puede_generar: boolean;
}

// ── Fotos ──────────────────────────────────────────────────────────────────

export interface FotoUploadResponse {
  foto_id: number;
  upload_url: string;
  blob_path: string;
  expires_at: string;
  instructions: {
    method: string;
    headers: Record<string, string>;
    note: string;
  };
}

export interface FotoConfirmResponse {
  foto_id: number;
  subida: boolean;
  ancho_px?: number;
  alto_px?: number;
  fotos_pendientes_del_reporte?: number;
}

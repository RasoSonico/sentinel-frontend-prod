/**
 * Constantes del módulo de reportes (ADR-006).
 *
 * Las que tienen contraparte en el backend están anotadas: si alguna cambia
 * aquí sin cambiar allá, el POST empieza a rebotar con 400 y el mensaje no
 * dice por qué.
 */

// Aquí vivía `SUPERVISION_FIJA = "URBA INGENIERÍA S.A. DE C.V."`, espejo de
// una constante del backend que también se retiró: fijaba una sola razón
// social para todas las obras. La supervisora ahora sale del roster —los
// proveedores con `tipo === "SUPERVISION"`— y la sigue escribiendo el
// servidor, no el payload.

/**
 * Las siete áreas, espejo EXACTO de `ReporteActividades.Area` del backend.
 *
 * Van fijas en código en los dos lados por decisión de negocio: llevarlas a
 * base de datos es una decisión aparte, que no hacía falta tomar para esta
 * entrega. Si se agrega un área aquí sin agregarla allá, el POST rebota con
 * 400 en `area` — y el mensaje sí dice por qué.
 *
 * El `valor` es lo que viaja; la `etiqueta` es lo que se muestra. El servidor
 * también devuelve `area_display` para no derivar traducciones en el cliente.
 */
export const AREAS = [
  { valor: "TOPOGRAFIA", etiqueta: "Topografía" },
  { valor: "CALIDAD", etiqueta: "Calidad" },
  { valor: "TERRACERIAS", etiqueta: "Terracerías" },
  { valor: "ESTRUCTURAS", etiqueta: "Estructuras" },
  { valor: "SEGURIDAD_HIGIENE", etiqueta: "Seguridad e Higiene" },
  { valor: "MEDIO_AMBIENTE", etiqueta: "Medio Ambiente" },
  { valor: "ASFALTOS", etiqueta: "Asfaltos" },
] as const;

export type AreaReporte = (typeof AREAS)[number]["valor"];

/** Etiqueta legible de un área; cae al valor crudo si no la reconoce. */
export const etiquetaDeArea = (valor: string): string =>
  AREAS.find((a) => a.valor === valor)?.etiqueta ?? valor;

/**
 * Espejo de `MAX_FOTOS_POR_REPORTE`.
 *
 * Era 6 porque el machote traía una rejilla de evidencia fija. Ya no: el
 * paginador del servidor parte las fotos en renglones de tres y abre hoja
 * nueva cuando un renglón no cabe, así que el documento aguanta las que le
 * manden. El tope de hoy es de captura, no de papel — en campo con 6 no
 * alcanzaba.
 *
 * El precio de subirlo es el peso: cada foto va a 1920 px y ~600 KB, así que
 * 15 son ~9 MB que con señal débil tardan en llegar. Tardan, no se pierden.
 */
export const MAX_FOTOS = 15;

/**
 * Espejo de `MAX_CARACTERES_PIE`.
 *
 * **No es una decisión de interfaz**: es el ancho impreso del bloque de foto
 * traducido a texto, medido con Carlito. Un pie más largo se cortaría en el
 * papel. Por eso el tope es duro y con contador visible: el usuario ve el
 * límite mientras escribe, en vez de descubrir el corte en el PDF.
 */
export const MAX_CARACTERES_PIE = 50;

/**
 * "ZONA · FRENTE", o cadena vacía si no hay ninguno de los dos.
 *
 * **Espejo de `Actividad.rotulo` del backend.** El documento lo arma allá; esto
 * existe para que la vista previa del wizard enseñe exactamente lo que se va a
 * imprimir. Si las dos reglas se separaran, el usuario revisaría una cosa y
 * entregaría otra — y la Revisión dejaría de servir para lo único que sirve.
 *
 * Vacío significa que no se pinta NADA: ni el rótulo ni un renglón en blanco
 * en su lugar. Con uno solo de los dos, el separador no cuelga.
 */
export const rotuloDeUbicacion = (zona?: string, frente?: string): string =>
  [zona, frente]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();

/** Mínimos para poder guardar (validados también en el servidor). */
export const MIN_ACTIVIDADES = 1;
export const MIN_CONTRATISTAS = 1;
/**
 * La supervisión dejó de ser fila fija y pasó a selección múltiple, así que
 * el mínimo tiene que exigirse igual que el de contratistas: antes lo
 * garantizaba el servidor barriendo el roster.
 */
export const MIN_SUPERVISION = 1;

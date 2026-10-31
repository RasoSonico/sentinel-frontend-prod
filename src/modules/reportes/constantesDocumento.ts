/**
 * Identidad del formato impreso, tal como la pinta el backend.
 *
 * Espejo de `reportes/services/constantes.py`. Viven aquí y no en el servicio
 * de red porque el Documento en Miniatura los muestra ANTES de que exista
 * cualquier respuesta del servidor: en el paso 4 el reporte todavía no se ha
 * enviado, y aun así tiene que enseñarse con el mismo encabezado con el que se
 * va a imprimir.
 */

export const FORMATO_CODIGO = "UIN-RP-F-002";
export const FORMATO_TITULO = "Reporte de actividades diario";

/**
 * Rutas del wizard de captura del reporte (ADR-006, D2).
 *
 * Stack propio y modal: el wizard es una sesión cerrada que se abre, se
 * completa y se descarta. Las pantallas de composición (una actividad, el
 * carrusel de una tanda de fotos) son rutas y no sheets porque el texto real
 * que se captura ahí son párrafos, no líneas.
 */
export type ReporteWizardParamList = {
  /** P-00 · selección de contratistas, previa al wizard */
  Proveedores: undefined;

  Paso1Actividades: undefined;
  /**
   * Composición de una actividad en pantalla propia.
   * `actividadId` ausente = se está creando; presente = se está editando.
   */
  ActividadCompose: { actividadId?: string } | undefined;

  Paso2Fotos: undefined;
  /** Carrusel de la tanda recién elegida, para capturar sus pies. */
  FotoCarrusel: { ids: string[] };
  FotoDetalle: { fotoId: string };

  Paso3Conclusion: undefined;
  Paso4Revision: undefined;
};

/**
 * A dónde vuelve una pantalla de edición abierta desde Revisión.
 *
 * El ✎ de cada bloque salta a su editor y **regresa directo a Revisión**, sin
 * recorrer los pasos intermedios: quien viene a verificar quiere arreglar y
 * volver a verificar, no reiniciar el recorrido.
 */
export type OrigenEdicion = "paso" | "revision";

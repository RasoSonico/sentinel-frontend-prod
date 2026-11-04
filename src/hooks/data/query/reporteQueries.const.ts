export const REPORTE_QUERY_KEYS = {
  /** Roster de contratistas de la obra (pantalla P-00) */
  PROVEEDORES: "reporteProveedores",
  /**
   * Lista de reportes de la obra.
   *
   * **El sufijo `.v2` no es decorativo.** La consulta pasó de `useQuery` a
   * `useInfiniteQuery` (F47), y las dos guardan formas distintas bajo la
   * misma llave: la vieja guardaba la respuesta pelada, la nueva guarda
   * `{ pages, pageParams }`. Como el caché de React Query se persiste en
   * AsyncStorage, al abrir la app con la versión nueva se rehidrataba la
   * forma vieja y la consulta infinita leía `pages` de algo que no lo tenía
   * — pantalla gris al entrar a Reportes.
   *
   * Cambiar la llave hace imposible esa lectura: lo guardado con la llave
   * vieja queda huérfano y lo recoge el recolector. **Cualquier cambio
   * futuro de forma bajo esta llave tiene que subir el número.**
   */
  REPORTES_POR_OBRA: "reportesPorObra.v2",
  /** Detalle de un reporte */
  REPORTE_DETALLE: "reporteDetalle",
};

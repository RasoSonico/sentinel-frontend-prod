import Realm from "realm";

/**
 * El reporte que se está capturando (ADR-006 F43).
 *
 * **Es una tabla aparte de la cola, a propósito.** La cola es para lo que el
 * usuario ya declaró terminado y va camino al servidor; esto es para lo que
 * todavía está escribiendo. Son dos ciclos de vida distintos —uno lo cierra el
 * servidor, el otro lo cierra una persona o el tiempo— y meterlos en la misma
 * clase obligaría a que cada lector de la cola preguntara en cuál de los dos
 * está parado.
 *
 * **Por qué dejó de vivir en memoria.** El ADR original lo justificaba con que
 * "el wizard es una sesión corta y el usuario no ha declarado nada todavía".
 * El campo dijo lo contrario: lo usan a lo largo de toda la jornada, entrando
 * y saliendo, y un supervisor perdió un día entero de captura por tocar la tab
 * de Reportes sin querer. La sesión no es corta y lo capturado sí es trabajo.
 *
 * El contenido va serializado en JSON por lo mismo que en la cola: es un
 * documento que se lee y se escribe entero, nunca se consulta por sus partes,
 * y modelar actividades y fotos como objetos embebidos costaría dos clases más
 * y una migración cada vez que el borrador gane un campo.
 */
export class BorradorReporte extends Realm.Object<BorradorReporte> {
  /** UUID local. No es el `client_id` del reporte: ese se acuña al encolar. */
  _id!: string;

  constructionId!: number;
  constructionName!: string;

  /**
   * Día LOCAL que el reporte documenta, `YYYY-MM-DD`.
   *
   * **Se congela al abrir el borrador y se conserva al retomarlo**, aunque se
   * retome al día siguiente: el día que se documenta es aquel en que se empezó
   * a documentar. Nunca `toISOString()` — ver las Precauciones del ADR-006.
   */
  fechaReporte!: string;

  /** Clave del área (`TOPOGRAFIA`, …). `""` mientras no se elige. */
  area!: string;
  conclusion!: string;

  /** `ActividadBorrador[]`, con su id local para reordenar y editar. */
  actividadesJson!: string;
  /** `FotoBorrador[]`, con el `localUri` del archivo en el teléfono. */
  fotosJson!: string;
  /** Contratistas Y supervisión: los ids que viajan en el POST. */
  proveedorIdsJson!: string;
  /** `Proveedor[]` completos, para pintar la Revisión sin volver a la red. */
  contratistasJson!: string;
  supervisionJson!: string;
  /** Geometría de la firma, o `null` mientras no se firma. */
  firmaJson!: string | null;

  /**
   * Dónde estaba el usuario la última vez (`paso1`…`paso4`), o `""`.
   *
   * **No es estado de interfaz guardado por guardarlo**: es lo que hace que
   * retomar se note. La pantalla de encuadre se ve igual llena que vacía, así
   * que caer ahí al retomar obliga a preguntarse si el reporte empezó de nuevo.
   * Devolver al usuario a sus actividades contesta esa pregunta sin texto.
   *
   * Solo las cuatro secciones. Las vistas de paso —la cámara, el detalle de
   * una foto— quedan fuera a propósito: volver dentro del visor de una foto no
   * es volver a lo que estabas haciendo.
   */
  ultimaSeccion!: string;

  createdAt!: Date;
  /**
   * Última edición. **De aquí cuelga la caducidad de 36 h**, que se mide desde
   * el último toque y no desde que se abrió: un borrador que se sigue
   * trabajando no caduca mientras se trabaja.
   */
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "BorradorReporte",
    primaryKey: "_id",
    properties: {
      _id: "string",

      constructionId: { type: "int", indexed: true },
      constructionName: "string",
      fechaReporte: "string",

      area: { type: "string", default: "" },
      conclusion: { type: "string", default: "" },

      actividadesJson: { type: "string", default: "[]" },
      fotosJson: { type: "string", default: "[]" },
      proveedorIdsJson: { type: "string", default: "[]" },
      contratistasJson: { type: "string", default: "[]" },
      supervisionJson: { type: "string", default: "[]" },
      firmaJson: "string?",

      ultimaSeccion: { type: "string", default: "" },

      createdAt: "date",
      updatedAt: { type: "date", indexed: true },
    },
  };
}

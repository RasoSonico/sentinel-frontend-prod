/**
 * Una de las últimas cargas de un concepto, para la trazabilidad de la ficha
 * (L-02) sin llamada de red ni dependencia de conexión.
 *
 * Viaja en `avance/base/` porque la lista de avances por catálogo se pagina a
 * 100: en un catálogo grande las cargas de un concepto concreto quedaban fuera
 * del corte y la ficha se veía vacía. Aquí son exactas y están disponibles
 * OFFLINE, que es el caso de obra. El historial completo se pide bajo demanda,
 * cuando el usuario lo pide explícitamente y hay red.
 *
 * `volumen` como string por la misma razón que el resto de decimales.
 */
export class UltimaCarga extends Realm.Object<UltimaCarga> {
  fecha!: string;
  volumen!: string;
  tiene_foto!: boolean;

  static schema: Realm.ObjectSchema = {
    name: "UltimaCarga",
    embedded: true,
    properties: {
      fecha: "string",
      volumen: "string",
      tiene_foto: { type: "bool", default: false },
    },
  };
}

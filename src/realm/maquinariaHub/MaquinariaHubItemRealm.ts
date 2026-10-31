import Realm from "realm";

import { DetalleJornadaRealm } from "./DetalleJornadaRealm";

export class MaquinariaHubItemRealm extends Realm.Object<MaquinariaHubItemRealm> {
  id!: number;
  tipo!: string;
  marca!: string;
  modelo!: string;
  propietario_tipo!: string;
  tipo_permanencia!: string;
  estancia_id!: number;
  estancia_fecha_ingreso!: string;
  jornada_id!: number | null;
  jornada_estado!: string | null;
  jornada_motivo_inactividad!: string | null;
  jornada_observaciones!: string | null;
  /**
   * Lo que la máquina hizo HOY, si ya se reportó.
   *
   * Sustituye a `jornada_catalog`/`jornada_concept`, que solo admitían una
   * actividad por día. Vive aquí —y no solo en la pantalla de captura— porque
   * la tarjeta del hub tiene que poder mostrar lo capturado sin red: que lo
   * reportado no vuelva a verse fue el motivo documentado de que el módulo
   * dejara de usarse.
   */
  jornada_detalles!: Realm.List<DetalleJornadaRealm>;
  /**
   * Las dos lecturas de HOY. Distintas de `ultimo_horometro`, que es la última
   * lectura de cierre que existe —de cualquier día— y sirve de referencia al
   * capturar.
   *
   * Viven aquí porque la previsualización del reporte imprime la tabla de
   * maquinaria completa —inicial, final y horas— y esa pantalla se usa en
   * obra. Lo que no esté en el caché no se puede enseñar sin señal.
   */
  jornada_horometro_inicial!: string | null;
  jornada_horometro_final!: string | null;
  requiere_reconciliacion!: boolean;
  dias_sin_reporte!: number;
  ultima_jornada_fecha!: string | null;
  // Última lectura de cierre del horómetro y su fecha. Viven aquí, y no se
  // piden al abrir la hoja de captura, porque la jornada se reporta en obra
  // —donde puede no haber señal— y sin la referencia no hay con qué comparar.
  ultimo_horometro!: string | null;
  ultimo_horometro_fecha!: string | null;
  /**
   * El último día que esta máquina **de verdad trabajó**, con todo lo que
   * hizo. Alimenta "Repetir lo del {fecha}".
   *
   * No es "ayer": las obras no tienen horario fijo y trabajar o no el domingo
   * es variable, así que buscar el día anterior dejaría el atajo inservible
   * después de cualquier pausa. La fecha viaja para que el botón pueda decir
   * de cuándo viene lo que va a copiar.
   */
  ultima_jornada_trabajada_fecha!: string | null;
  ultima_jornada_trabajada_detalles!: Realm.List<DetalleJornadaRealm>;

  static schema: Realm.ObjectSchema = {
    name: "MaquinariaHubItemRealm",
    embedded: true,
    properties: {
      id: "int",
      tipo: "string",
      marca: "string",
      modelo: "string",
      propietario_tipo: "string",
      tipo_permanencia: "string",
      estancia_id: "int",
      estancia_fecha_ingreso: "string",
      jornada_id: "int?",
      jornada_estado: "string?",
      jornada_motivo_inactividad: "string?",
      jornada_observaciones: "string?",
      jornada_detalles: { type: "list", objectType: "DetalleJornadaRealm" },
      jornada_horometro_inicial: "string?",
      jornada_horometro_final: "string?",
      requiere_reconciliacion: "bool",
      dias_sin_reporte: "int",
      ultima_jornada_fecha: "string?",
      ultimo_horometro: "string?",
      ultimo_horometro_fecha: "string?",
      ultima_jornada_trabajada_fecha: "string?",
      ultima_jornada_trabajada_detalles: {
        type: "list",
        objectType: "DetalleJornadaRealm",
      },
    },
  };
}

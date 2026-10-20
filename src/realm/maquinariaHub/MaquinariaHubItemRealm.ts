import Realm from "realm";

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
  jornada_catalog!: number | null;
  jornada_concept!: number | null;
  jornada_motivo_inactividad!: string | null;
  jornada_observaciones!: string | null;
  requiere_reconciliacion!: boolean;
  dias_sin_reporte!: number;
  ultima_jornada_fecha!: string | null;
  // Última lectura de cierre del horómetro y su fecha. Viven aquí, y no se
  // piden al abrir la hoja de captura, porque la jornada se reporta en obra
  // —donde puede no haber señal— y sin la referencia no hay con qué comparar.
  ultimo_horometro!: string | null;
  ultimo_horometro_fecha!: string | null;

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
      jornada_catalog: "int?",
      jornada_concept: "int?",
      jornada_motivo_inactividad: "string?",
      jornada_observaciones: "string?",
      requiere_reconciliacion: "bool",
      dias_sin_reporte: "int",
      ultima_jornada_fecha: "string?",
      ultimo_horometro: "string?",
      ultimo_horometro_fecha: "string?",
    },
  };
}

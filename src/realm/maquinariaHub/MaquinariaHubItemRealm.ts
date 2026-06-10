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
    },
  };
}

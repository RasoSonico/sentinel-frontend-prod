import Realm from "realm";

/**
 * Un renglón de lo que hizo una máquina en un día.
 *
 * **Una sola clase para dos usos**: los renglones que llegan del hub (lo
 * capturado hoy y lo de la última jornada trabajada, para "Repetir") y los que
 * esperan en la cola de envío. Son el mismo dato en dos momentos de su vida, y
 * dos clases gemelas solo darían dos lugares donde equivocarse.
 *
 * Por eso lleva los **nombres del servidor** y no el camelCase del resto de la
 * cola: así lo que baja del hub se escribe sin traducir, que es el paso donde
 * ya nos mordió un desajuste de tipos.
 *
 * `horas_estimadas` es CADENA, no número, por dos razones que se refuerzan:
 * el servidor lo manda como cadena —igual que el horómetro— y guardarlo como
 * `double` perdería décimas. Es el reparto a ojo del supervisor, no una
 * medición, pero eso no lo vuelve menos merecedor de llegar intacto.
 */
export class DetalleJornadaRealm extends Realm.Object<DetalleJornadaRealm> {
  orden!: number;
  /** Concepto del catálogo. `null` cuando la actividad se escribió a mano. */
  concept!: number | null;
  /** Texto libre. Vacío cuando la actividad es un concepto. */
  descripcion!: string;
  horas_estimadas!: string | null;
  /**
   * Cuándo se registró y quién. En el hub vienen del servidor; en la cola
   * quedan nulos —la captura misma lleva la hora y el autor—.
   */
  registrado_en!: string | null;
  autor!: string | null;

  static schema: Realm.ObjectSchema = {
    name: "DetalleJornadaRealm",
    embedded: true,
    properties: {
      orden: "int",
      concept: "int?",
      descripcion: { type: "string", default: "" },
      horas_estimadas: "string?",
      registrado_en: "string?",
      autor: "string?",
    },
  };
}

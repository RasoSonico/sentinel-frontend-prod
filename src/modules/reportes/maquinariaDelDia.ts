/**
 * La tabla MAQUINARIA DEL DÍA del documento, como **funciones puras**.
 *
 * El supervisor no captura nada de esto en el wizard: lo que reportó en la tab
 * de Maquinaria ese día se copia al reporte al emitirlo. Pero la
 * previsualización tiene que enseñarlo, porque enseña lo que se va a recibir, y
 * un entregable al que le falta una sección entera no es el entregable.
 *
 * **Estas reglas son una COPIA de las del servidor, y tienen que seguir
 * siéndolo.** Si el teléfono redondeara distinto, la previsualización y el PDF
 * dirían números diferentes del mismo día y la pantalla dejaría de servir para
 * lo único que sirve: verificar antes de firmar. Cada función de abajo dice de
 * qué función del backend es espejo.
 *
 * Sin React ni Realm a propósito: entra una lista, sale otra. Eso es lo que
 * permite probarlas contra los casos de verdad (`maquinariaDelDia.test.mjs`).
 */

/** Una máquina del día, con la forma del snapshot del servidor. */
export interface MaquinaDelDia {
  /** "Retroexcavadora JCB 3CX", ya compuesto. */
  equipo: string;
  /** `TRABAJANDO` | `SIN_OPERAR`. */
  estado: string;
  motivoInactividad: string | null;
  /** Las lecturas como CADENA: son la base sobre la que factura una renta. */
  horometroInicial: string | null;
  horometroFinal: string | null;
}

/**
 * La maquinaria de un día, **con la honestidad incluida**.
 *
 * `conocida` separa dos cosas que una lista vacía confunde: que ese día no
 * hubiera equipo reportado, y que este teléfono no tenga con qué saberlo —el
 * caché del hub se guarda por día, y de un día que nunca se abrió no hay
 * nada—. La primera se imprime como "no se imprimirá esta sección"; la
 * segunda no se puede afirmar sin mentir.
 */
export interface MaquinariaDelDocumento {
  maquinas: MaquinaDelDia[];
  conocida: boolean;
}

/** Un renglón ya listo para pintar: puro texto, nada que decidir al render. */
export interface RenglonMaquinaria {
  equipo: string;
  /** "Trabajó" · "No operó · Falla mecánica". */
  estado: string;
  inicial: string;
  final: string;
  horas: string;
}

/** Espejo de `_MOTIVOS` en `reportes/services/reporte_spec.py`. */
const MOTIVOS: Record<string, string> = {
  FALLA_MECANICA: "Falla mecánica",
  SIN_OPERADOR: "Sin operador",
  SIN_FRENTE: "Sin frente de trabajo",
  CLIMA: "Clima",
  OTRO: "Otro motivo",
};

/** Lo que el documento imprime donde no hay dato. */
export const SIN_DATO = "—";

/**
 * Las lecturas se manejan en DÉCIMAS ENTERAS, no en flotante.
 *
 * El servidor las guarda en `Decimal`, y `1248.3 − 1240.1` en punto flotante
 * da 8.199999999999999. Impreso, eso es una tabla que no cuadra con el PDF del
 * mismo día. En décimas la resta es exacta porque el horómetro tiene una sola
 * decimal.
 *
 * `null` cuando no hay lectura o cuando lo capturado no es un número: el
 * documento imprime "—" ahí, y "—" es más honesto que un 0 inventado.
 */
const decimas = (lectura: string | null): number | null => {
  if (lectura === null || lectura.trim() === "") return null;
  const valor = Number(lectura);
  return Number.isFinite(valor) ? Math.round(valor * 10) : null;
};

/** Espejo de `_cifra`: 12405 décimas → "1,240.5". Son cifras de cinco dígitos. */
const cifra = (d: number): string => {
  const signo = d < 0 ? "-" : "";
  const abs = Math.abs(d);
  const entero = String(Math.floor(abs / 10)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );
  return `${signo}${entero}.${abs % 10}`;
};

/** Espejo de `_horas`: 80 → "8", 75 → "7.5". Sin decimal de relleno. */
const horas = (d: number): string => {
  const signo = d < 0 ? "-" : "";
  const abs = Math.abs(d);
  const entero = Math.floor(abs / 10);
  const decimal = abs % 10;
  return `${signo}${decimal === 0 ? entero : `${entero}.${decimal}`}`;
};

/**
 * Espejo de `MaquinariaReporte.horas`: `final − inicial`, en décimas.
 *
 * `null` si falta cualquiera de las dos. **No se acota a cero** cuando el final
 * es menor: un horómetro reemplazado da legítimamente una lectura menor, y
 * aplanarla la volvería indistinguible de una máquina que no trabajó. Es un
 * dato que alguien tiene que mirar, y por eso se imprime como salga.
 */
const resta = (i: number | null, f: number | null): number | null =>
  i === null || f === null ? null : f - i;

export const horasEnDecimas = (
  inicial: string | null,
  final: string | null,
): number | null => resta(decimas(inicial), decimas(final));

/**
 * Espejo de `_etiqueta`: tipo, marca y modelo con un espacio, sin huecos.
 *
 * Se compone aquí y no se toma de `maquinariaEtiqueta` de la cola, que usa "·"
 * como separador: lo que se previsualiza tiene que decirse igual que lo que se
 * imprime.
 */
export const etiquetaEquipo = (
  tipo: string,
  marca: string,
  modelo: string,
): string =>
  [tipo, marca, modelo]
    .map((parte) => (parte ?? "").trim())
    .filter(Boolean)
    .join(" ");

/**
 * Espejo de `_estado_impreso`: "Trabajó" o "No operó · {motivo}".
 *
 * En columna y no en renglón aparte, igual que en el documento: así cada
 * máquina ocupa una fila y la tabla tiene una sola forma.
 */
export const estadoImpreso = (maquina: MaquinaDelDia): string => {
  if (maquina.estado === "TRABAJANDO") return "Trabajó";
  const motivo = MOTIVOS[maquina.motivoInactividad ?? ""] ?? "";
  return motivo ? `No operó · ${motivo}` : "No operó";
};

/** La tabla completa, un renglón por máquina y en el mismo orden que entró. */
export const renglonesMaquinaria = (
  maquinas: MaquinaDelDia[],
): RenglonMaquinaria[] =>
  maquinas.map((maquina) => {
    const i = decimas(maquina.horometroInicial);
    const f = decimas(maquina.horometroFinal);
    const h = resta(i, f);
    return {
      equipo: maquina.equipo,
      estado: estadoImpreso(maquina),
      inicial: i === null ? SIN_DATO : cifra(i),
      final: f === null ? SIN_DATO : cifra(f),
      horas: h === null ? SIN_DATO : horas(h),
    };
  });

/**
 * El TOTAL HORAS-MÁQUINA del pie de la tabla.
 *
 * Suma solo lo que tiene las dos lecturas; una máquina a medias no aporta ni
 * resta. Sin máquinas no hay total: "—", no "0" —que se leería como "estuvo el
 * equipo y no trabajó"—. Espejo del cálculo de `build_spec`.
 */
export const totalHorasMaquina = (maquinas: MaquinaDelDia[]): string => {
  if (maquinas.length === 0) return SIN_DATO;
  const total = maquinas.reduce((suma, maquina) => {
    const h = horasEnDecimas(maquina.horometroInicial, maquina.horometroFinal);
    return h === null ? suma : suma + h;
  }, 0);
  return horas(total);
};

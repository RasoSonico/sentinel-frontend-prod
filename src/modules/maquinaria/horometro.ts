/**
 * Utilidades de lectura del horómetro.
 *
 * Viven aparte porque las comparten el bloque de captura y el resumen de la
 * hoja, y porque la regla de formato es una decisión y no un detalle: una
 * lectura se teclea con décimas y se guarda **como cadena**, nunca como
 * flotante. Es la base sobre la que factura una renta.
 */

/** Deja pasar dígitos y UN punto decimal; los horómetros marcan décimas. */
export const soloLectura = (texto: string): string => {
  const limpio = texto.replace(/[^0-9.]/g, "");
  const [entera, ...resto] = limpio.split(".");
  return resto.length
    ? `${entera.slice(0, 7)}.${resto.join("").slice(0, 1)}`
    : entera.slice(0, 7);
};

export const numeroDe = (texto: string | null | undefined): number | null => {
  if (!texto || texto === ".") return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
};

/** 8 → "8", 8.5 → "8.5". Sin decimal de relleno cuando es redondo. */
export const formatoHoras = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

/** 3419.5 → "3,419.5". Con separador: son cifras de cuatro y cinco dígitos. */
export const formatoLectura = (n: number): string =>
  n.toLocaleString("es-MX", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/**
 * `2026-10-11` → `11 oct`.
 *
 * Por componentes y **no** con `new Date(iso)`: ese constructor interpreta la
 * cadena como UTC y en México corre el día hacia atrás. Mismo criterio que
 * `fechaPrograma.ts` documenta para la sábana.
 */
export const fechaCortaLocal = (iso: string): string => {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d || m < 1 || m > 12) return iso;
  return `${d} ${MESES[m - 1]}`;
};

/** Tope por encima del cual una jornada deja de ser creíble. */
export const HORAS_SOSPECHOSAS = 16;

export interface AvisoHorometro {
  texto: string;
  tono: "alerta" | "aviso";
}

/**
 * El aviso que corresponde a un par de lecturas, o `null`.
 *
 * **Advierte sin bloquear.** Las dos situaciones que marca pueden ser ciertas:
 * un horómetro reemplazado produce legítimamente una lectura menor, y una
 * jornada larga de verdad existe. Quien decide si se corrige es la persona.
 */
export const avisoDeLecturas = (
  inicial: number | null,
  final: number | null,
): AvisoHorometro | null => {
  if (inicial === null || final === null) return null;
  const horas = final - inicial;
  if (horas < 0) {
    return {
      texto: "El final es menor que el inicial. ¿Cambiaron el horómetro? Puedes guardar así.",
      tono: "alerta",
    };
  }
  if (horas > HORAS_SOSPECHOSAS) {
    return {
      texto: `${formatoHoras(horas)} h en una jornada. Revisa la lectura; puedes guardar así.`,
      tono: "aviso",
    };
  }
  return null;
};

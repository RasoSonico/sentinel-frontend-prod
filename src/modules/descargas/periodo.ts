/**
 * Del valor del selector de fechas a las fechas de calendario que pide el
 * servidor.
 *
 * El selector de la app (`DateRangeFilter`) se hizo para filtrar INSTANTES:
 * entrega el rango como el primer y el último segundo de los días elegidos,
 * en UTC ("2026-10-01T06:00:00Z" … "2026-11-01T05:59:59Z" en el centro del
 * país). La descarga pide DÍAS: `desde=2026-10-01&hasta=2026-10-31`.
 *
 * Cortar la cadena en la "T" daría el día UTC, que en México es el siguiente
 * por la noche: el final de octubre saldría "2026-11-01". Se lee el instante
 * en la hora del teléfono —la de la obra— y se toma su fecha local.
 */

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const dos = (n: number) => String(n).padStart(2, "0");

/** Un valor del selector → `YYYY-MM-DD` local. Una fecha pura pasa tal cual. */
export const fechaLocal = (valor: string): string => {
  if (SOLO_FECHA.test(valor)) return valor;
  const d = new Date(valor);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};

export interface Periodo {
  desde: string;
  hasta: string;
}

/**
 * El rango a pedir, o `null` si el filtro no tiene uno completo. Si viniera
 * al revés, se ordena: el servidor lo rechazaría con un 400 que no le dice
 * nada útil a quien solo tocó dos fechas.
 */
export const periodoDe = (filtro: {
  type: "range" | "single";
  startDate?: string;
  endDate?: string;
  date?: string;
} | null): Periodo | null => {
  if (!filtro) return null;
  if (filtro.type === "single" && filtro.date) {
    const dia = fechaLocal(filtro.date);
    return { desde: dia, hasta: dia };
  }
  if (!filtro.startDate || !filtro.endDate) return null;
  const a = fechaLocal(filtro.startDate);
  const b = fechaLocal(filtro.endDate);
  return a <= b ? { desde: a, hasta: b } : { desde: b, hasta: a };
};

/** Días del periodo, extremos incluidos. */
export const diasDe = ({ desde, hasta }: Periodo): number => {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000) + 1;
};

/** El mismo tope que el servidor: un año. */
export const MAX_DIAS = 366;

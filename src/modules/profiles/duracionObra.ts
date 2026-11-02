/**
 * Cuánto dura la obra, en DÍAS NATURALES: "167 días".
 *
 * Así se mide contractualmente el plazo de ejecución, así que es la única
 * unidad que no se presta a dos lecturas — un "5.5 meses" dependería de
 * cuántos días tiene cada mes.
 *
 * **Cuenta los dos extremos** (decisión del 2-nov): del 15 de enero al 30 de
 * junio de 2026 son 167 días, como se escribe el plazo en contrato. Una obra
 * que empieza y termina el mismo día dura 1 día.
 *
 * Por COMPONENTES de la fecha y no con `new Date("2026-01-15")`: ese
 * constructor lee la fecha como medianoche UTC, que en México es el día
 * anterior (el mismo defecto que movía las fechas de la tarjeta).
 *
 * `null` si falta una fecha o si el fin es anterior al inicio: no hay
 * duración que decir.
 */

const FECHA = /^(\d{4})-(\d{2})-(\d{2})/;

const enDias = (texto: string | null | undefined): number | null => {
  const p = FECHA.exec(texto ?? "");
  if (!p) return null;
  return Date.UTC(Number(p[1]), Number(p[2]) - 1, Number(p[3])) / 86400000;
};

/** Días naturales entre dos fechas, ambos extremos incluidos. */
export function diasNaturales(
  inicio: string | null | undefined,
  fin: string | null | undefined,
): number | null {
  const i = enDias(inicio);
  const f = enDias(fin);
  if (i === null || f === null || f < i) return null;
  return f - i + 1;
}

/** "167 días", "1 día", "1,095 días"; `null` si no hay duración. */
export function duracionObra(
  inicio: string | null | undefined,
  fin: string | null | undefined,
): string | null {
  const dias = diasNaturales(inicio, fin);
  if (dias === null) return null;
  const conComas = String(dias).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dias === 1 ? "1 día" : `${conComas} días`;
}

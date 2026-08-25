/**
 * Formateo de las fechas del programa contractual (`YYYY-MM-DD`).
 *
 * Siempre POR COMPONENTES, nunca con `new Date(string)`: JavaScript interpreta
 * un `YYYY-MM-DD` pelado como medianoche UTC, y en México eso lo corre un día
 * hacia atrás — un corte del 19 se mostraría como 18 (D9 del ADR-003).
 *
 * Estas fechas son de CALENDARIO CONTRACTUAL, no instantes: no tienen hora ni
 * huso que respetar. Por eso no pasan por `DateUtils`, que trabaja sobre
 * timestamps UTC del servidor.
 */

import { diaCivil } from "src/hooks/data/query/useAvance/utils/programaCalculos";

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Partes numéricas, o `null` si la cadena no tiene la forma esperada. */
function partes(iso: string): { anio: number; mes: number; dia: number } | null {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !m || !d || m < 1 || m > 12) return null;
  return { anio: a, mes: m, dia: d };
}

/** `2026-08-19` → `19/08`. Para chips, donde cada carácter cuesta. */
export function fechaCorta(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  return `${String(p.dia).padStart(2, "0")}/${String(p.mes).padStart(2, "0")}`;
}

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/**
 * `2026-08-16` → `dom 16 ago`.
 *
 * El día de la semana no es adorno: el corte de la obra cae siempre en el mismo
 * día (`dia_corte`), así que verlo escrito confirma de un vistazo que la fecha
 * pertenece al ciclo de corte y no es una fecha suelta. Sin él, "CORTE 16 AGO"
 * obliga a ir al calendario para saber si el corte ya pasó este domingo o es el
 * siguiente.
 *
 * El día se deriva de `diaCivil` —contador de días, sin husos— y no de `Date`,
 * por la misma razón que todo lo demás en este módulo.
 */
export function fechaConDia(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  const d = diaCivil(iso);
  if (isNaN(d)) return iso;
  // 1970-01-01 fue jueves; +4 alinea el índice 0 con domingo.
  const diaSemana = DIAS_CORTOS[(((d + 4) % 7) + 7) % 7];
  return `${diaSemana} ${p.dia} ${MESES_CORTOS[p.mes - 1]}`;
}

/** `2026-08-19` → `19 de agosto`. Para el encabezado del recuadro de la ficha. */
export function fechaLarga(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  return `${p.dia} de ${MESES_LARGOS[p.mes - 1]}`;
}

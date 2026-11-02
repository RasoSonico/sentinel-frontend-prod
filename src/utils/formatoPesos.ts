/**
 * Un monto en pesos, completo y exacto: "$1,284,567,890.45".
 *
 * Signo de pesos, comas de miles, punto decimal y siempre dos centavos. Para
 * cualquier lugar de la app que muestre dinero: que el siguiente no vuelva a
 * inventar abreviaturas como "$1284.57 M".
 *
 * **Se formatea el TEXTO, sin pasar por `parseFloat`.** El servidor manda los
 * montos como cadena ("1284567890.45") y la base admite hasta 13 dígitos
 * enteros (`Decimal(15,2)`). Un `number` de JavaScript guarda bien unos 15–16
 * dígitos: hoy alcanzaría, pero agrupar el texto no depende de eso y no
 * redondea nunca. Tampoco depende de que `Intl` venga completo en Hermes.
 *
 * Devuelve `null` si el texto no es un monto: quien llama decide qué mostrar
 * ("No definido", por ejemplo).
 */
export function formatoPesos(texto: string | null | undefined): string | null {
  const limpio = (texto ?? "").trim();
  const partes = /^(-)?(\d+)(?:\.(\d+))?$/.exec(limpio);
  if (!partes) return null;

  const [, menos, enteros, decimales = ""] = partes;
  const sinCeros = enteros.replace(/^0+(?=\d)/, "");
  const conComas = sinCeros.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // Dos centavos siempre. Si llegaran más (la base guarda dos), se cortan:
  // redondear aquí inventaría un centavo que nadie capturó.
  const centavos = decimales.padEnd(2, "0").slice(0, 2);

  return `${menos ? "-" : ""}$${conComas}.${centavos}`;
}

/** ¿Es un monto capturado? "0.00" no: es el default de la base, no un presupuesto. */
export function hayMonto(texto: string | null | undefined): boolean {
  const limpio = (texto ?? "").trim();
  return /^-?\d+(\.\d+)?$/.test(limpio) && /[1-9]/.test(limpio);
}

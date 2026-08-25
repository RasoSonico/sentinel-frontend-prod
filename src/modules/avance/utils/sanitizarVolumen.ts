/**
 * Saneado del input de volumen, compartido por el formulario clásico
 * (`QuantityInput`) y la captura rápida (`CapturaRapidaSheet`).
 *
 * Existía ya dentro de `QuantityInput`, inline y con dos defectos que se
 * arrastraban al extraerlo:
 *
 *   1. **La coma se borraba.** El filtro era `[^0-9.]`, así que un `12,5`
 *      —lo que produce el teclado decimal en un dispositivo en español—
 *      quedaba en `125`. Un error de 10× en un dato de obra, silencioso.
 *      Aquí la coma se NORMALIZA a punto en vez de eliminarse.
 *   2. **Un segundo punto congelaba el campo.** Al teclear `1.2.3` la función
 *      retornaba sin llamar a `onChange`, así que el carácter simplemente no
 *      aparecía y nada explicaba por qué. Aquí se conserva el primer separador
 *      y se ignoran los siguientes: el campo nunca deja de responder.
 *
 * El máximo de decimales es parámetro y no constante porque los dos llamadores
 * difieren a propósito: el backend guarda `Decimal(14,4)`, así que 4 es la
 * precisión real del sistema.
 */
export function sanitizarVolumen(valor: string, maxDecimales: number): string {
  // La coma es separador decimal, no basura: normalizarla antes de filtrar.
  const conPunto = valor.replace(/,/g, ".");
  const soloValidos = conPunto.replace(/[^0-9.]/g, "");

  const [entera, ...resto] = soloValidos.split(".");
  if (resto.length === 0) return entera;

  // Todo lo que siga al primer punto es la parte decimal; los puntos de más
  // se descartan en vez de bloquear la escritura.
  const decimal = resto.join("").slice(0, maxDecimales);
  return `${entera}.${decimal}`;
}

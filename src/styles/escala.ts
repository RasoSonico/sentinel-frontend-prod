import { Dimensions } from "react-native";

/**
 * Escalas por clase de dispositivo, en un solo lugar.
 *
 * El helper `sp()` estaba copiado literalmente en seis archivos de estilos
 * (`ConceptoSheet`, `CapturaRapidaSheet`, `HoyResumenHeader`, `RecuadroPrograma`,
 * `HubResumenHeader`, `MaquinariaCard`). Seis copias es seis oportunidades de
 * que diverjan sin que nadie se entere.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ TEXTO Y ESPACIO NO COMPARTEN ESCALA
 * ─────────────────────────────────────────────────────────────────────────────
 * Hoy NINGÚN `fontSize` de la app pasa por `sp()`: los márgenes crecen en tablet
 * y se encogen en teléfono chico, pero la letra se queda clavada. Por eso la
 * proporción entre texto y espacio cambia de un dispositivo a otro.
 *
 * La tentación es envolver también los `fontSize` en `sp()`. No se debe: con
 * ×1.5 un cuerpo de 12 salta a 18 en tablet —titular, no cuerpo— y con ×0.8
 * cae a 9.6 en un teléfono chico, ilegible bajo el sol de una obra. **El texto
 * tiene un piso de legibilidad que el espacio en blanco no tiene**, así que
 * escala en una curva más suave y con un mínimo duro.
 */

const { width: screenWidth } = Dimensions.get("window");

export const isTablet = screenWidth >= 768;
export const isSmallPhone = screenWidth < 375;

/** Por debajo de esto no se lee a distancia de brazo con guantes y polvo. */
export const MIN_FONT_SIZE = 11;

/** Espaciado: márgenes, paddings, altos. Curva agresiva, sin piso. */
export const sp = (base: number): number => {
  if (isTablet) return base * 1.5;
  if (isSmallPhone) return base * 0.8;
  return base;
};

/**
 * Tipografía. Curva suave (±15% / −5%) y piso duro en `MIN_FONT_SIZE`.
 * Se redondea a medio punto para no dejar el texto en sub-pixel borroso.
 */
export const fs = (base: number): number => {
  const escalado = isTablet ? base * 1.15 : isSmallPhone ? base * 0.95 : base;
  return Math.max(MIN_FONT_SIZE, Math.round(escalado * 2) / 2);
};

/**
 * Interlínea DERIVADA del cuerpo, no capturada aparte.
 *
 * Es la pieza que faltaba para que la relación de aspecto sea la misma en todos
 * lados: si `fontSize` y `lineHeight` se escriben como dos números sueltos, al
 * mover uno el bloque se aprieta o se afloja. Derivándola, la proporción
 * sobrevive a cualquier cambio de cuerpo y a cualquier dispositivo.
 *
 * 1.4 es la razón que traían los estilos originales (15/21) y funciona para
 * texto corrido; para titulares de una línea, 1.2 aprieta mejor.
 */
export const lh = (fontSize: number, razon = 1.4): number =>
  Math.round(fontSize * razon);

import type { ViewStyle } from "react-native";

import { DesignTokens } from "src/styles/designTokens";

/**
 * Patrón "cerrado" — ADR-007 D11. **Estándar de toda la app.**
 *
 * Un elemento que el usuario ya completó en la pantalla actual se presenta con
 * contorno oscuro y relleno azul tenue. Uno abierto o en edición lleva borde
 * gris y fondo blanco. El lenguaje es exclusivo: ningún otro estado usa esa
 * combinación, y por eso se aprende una vez y se reconoce en todas partes.
 *
 * Nació resolviendo el abandono del módulo de maquinaria: el diagnóstico fue
 * que **lo capturado no vuelve a verse**, así que el usuario no podía
 * comprobar qué había pasado. Esto le da una respuesta que no hay que leer.
 *
 * ## Las reglas, que importan tanto como los colores
 *
 * 1. **Cerrado = completo en esta pantalla, NO sincronizado.** El estado de
 *    envío tiene su propio lenguaje —nube, "Por enviar"— y los dos conviven:
 *    un bloque puede estar cerrado y por enviar al mismo tiempo.
 * 2. **Lo cerrado siempre se reabre con un tap.** Si un dato no se puede
 *    editar (solo lectura, aprobado por inspector) **no usa este patrón**.
 * 3. **El color nunca va solo.** Cerrar siempre cambia también la forma: un
 *    bloque se compacta, un control se marca. El estado se lee aunque no se
 *    distingan los colores.
 * 4. **Sin color semántico en el relleno.** Verde, rojo y ámbar no rellenan
 *    elementos cerrados. Si hace falta un matiz (Sí/No), va en un punto
 *    pequeño. El ámbar sigue reservado a alertas (`coloresAvance.ts`).
 * 5. **Un valor por defecto válido cuenta como cerrado**, porque se guardará
 *    tal cual. Una SUGERENCIA (un placeholder) no cuenta hasta que el bloque
 *    se cierre.
 * 6. **No se combina con bordes izquierdos de color**, reservados a
 *    `AdvanceListScreen`.
 */

const { colors } = DesignTokens;

/** Bloque mientras se captura: borde neutro, fondo blanco. */
export const bloqueAbierto: ViewStyle = {
  borderWidth: 1,
  borderColor: colors.neutral[300],
  backgroundColor: colors.background.primary,
};

/** Bloque ya completo y compactado. */
export const bloqueCerrado: ViewStyle = {
  borderWidth: 1.5,
  borderColor: colors.executive.secondary,
  backgroundColor: colors.cerrado.fondo,
};

/** Opción disponible no elegida, en una selección de una sola opción. */
export const controlNoElegido: ViewStyle = {
  borderWidth: 1,
  borderColor: colors.neutral[200],
  backgroundColor: colors.background.primary,
};

/**
 * Opción elegida.
 *
 * Usa el slate 100 y no el 50 del bloque: a este tamaño el 50 no se distingue
 * del blanco.
 */
export const controlElegido: ViewStyle = {
  borderWidth: 1.5,
  borderColor: colors.executive.secondary,
  backgroundColor: colors.cerrado.fondoControl,
};

/**
 * Duración del pliegue abierto → cerrado, en milisegundos. El ADR fija 240–280
 * con `ease-out`.
 *
 * **El pliegue todavía NO está implementado, y la constante está parada aquí
 * esperándolo.** El primer intento usó `layout` de Reanimated sobre los
 * bloques, y eso anima cualquier cambio de tamaño del nodo: un campo
 * multilínea crece al escribir, así que cada tecla movía el bloque entero y
 * la hoja temblaba sin dejar leer lo que se tecleaba.
 *
 * La forma correcta es animar la ENTRADA y la SALIDA de los subárboles
 * —abierto y compacto son dos subárboles distintos, no el mismo nodo
 * cambiando de tamaño—, y respetar la preferencia de "reducir movimiento"
 * del sistema (`AccessibilityInfo.isReduceMotionEnabled`) cuando se haga.
 */
export const DURACION_PLIEGUE = 260;

/**
 * Atajo para un bloque. `style={[estilos.bloque, bloque(estaCerrado)]}`.
 *
 * Existe para que el sitio de uso diga *qué* está pasando y no *qué colores*
 * usar: si mañana el patrón cambia de tono, cambia aquí y en ningún otro lado.
 */
export const bloque = (cerrado: boolean): ViewStyle =>
  cerrado ? bloqueCerrado : bloqueAbierto;

/** Atajo para un control de selección. */
export const control = (elegido: boolean): ViewStyle =>
  elegido ? controlElegido : controlNoElegido;

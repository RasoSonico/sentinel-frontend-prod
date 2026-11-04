/**
 * Las dos reglas que la app aplica sobre la red, en un solo lugar.
 *
 * Están aquí y no repetidas en cada consulta porque las dos se habían escrito
 * al revés en trece archivos a la vez, y un criterio que vive trece veces se
 * corrige doce veces y media.
 *
 * El contexto que las decide: **en obra la señal débil es la condición normal
 * del día**, no una excepción. Hay zonas con señal, zonas sin ella y
 * transiciones, y la app pasa buena parte de la jornada en el tercer estado
 * que su modelo binario no contemplaba — *hay red y no sirve*.
 */

/** Lo que `useNetworkStatus` responde: `null` es "todavía no se sabe". */
type EstadoDeRed = boolean | null;

interface EstadoDeConsulta {
  isPending: boolean;
  fetchStatus: "fetching" | "paused" | "idle";
}

/**
 * ¿Vale la pena mandar la petición?
 *
 * **Solo un `false` explícito dice que no.** `null` es "todavía no se sabe", y
 * tratarlo como "no hay red" deja la consulta sin disparar —y, si NetInfo
 * nunca resuelve, sin disparar nunca—. Es la misma asimetría que eligió F25
 * del ADR-006 para el worker: intentar sin conexión cuesta una petición que
 * falla; no intentar creyendo que no hay red cuesta una pantalla trabada.
 *
 * Y cuesta de verdad: `enabled: isOnline === true` dejaba el hub de maquinaria
 * con el spinner para siempre cuando la sonda de NetInfo fallaba en la red de
 * la obra mientras la API respondía perfecto.
 */
export const puedeIntentar = (isOnline: EstadoDeRed): boolean =>
  isOnline !== false;

/**
 * ¿Hay que enseñar el spinner de primera carga?
 *
 * Tres condiciones, y la tercera es la que faltaba: **que de verdad haya algo
 * en vuelo**. Una consulta deshabilitada se queda en `isPending` para siempre
 * con `fetchStatus: "idle"`, así que `!copia && isPending` pintaba un spinner
 * eterno sobre algo que nadie estaba pidiendo — sin señal y sin caché, la
 * pantalla no tenía salida.
 *
 * Un spinner promete que algo está ocurriendo. Si no ocurre nada, miente, y el
 * usuario se queda esperando en vez de enterarse de que no hay nada que
 * esperar.
 */
export const cargandoPorPrimeraVez = (
  hayCopia: boolean,
  consulta: EstadoDeConsulta,
): boolean =>
  !hayCopia && consulta.isPending && consulta.fetchStatus !== "idle";

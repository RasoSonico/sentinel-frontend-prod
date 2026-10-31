import { useCallback, useEffect, useMemo, useReducer } from "react";

import { estadoInicial, reducir } from "./reglaDelTap";

/**
 * Regla del tap — ADR-007 D12. **Estándar de toda la app.**
 *
 * *Un tap expresa una sola intención y se cumple completa.*
 *
 * ## Qué hace este archivo y qué no
 *
 * **Toda la lógica vive en `reglaDelTap.ts`**, como máquina de estados pura, y
 * está probada ahí contra todos los órdenes de eventos que React Native puede
 * producir (`reglaDelTap.test.mjs`). Este archivo es solo el puente: traduce
 * los eventos de la plataforma y programa el cuadro de gracia.
 *
 * La separación no es ceremonia. La primera versión llevaba la lógica aquí
 * dentro, enredada con refs y `requestAnimationFrame`, y tenía un defecto de
 * orden que no se veía leyendo el código ni probando a mano: si el `onFocus`
 * de un campo llegaba antes que la captura del contenedor, el elemento se
 * abría y un cierre agendado lo apagaba un cuadro después. En el teléfono eso
 * se sentía como *"la actividad no sale a la primera"*.
 *
 * ## El error que corrige la regla
 *
 * Un tap tiene dos momentos: cuando el dedo toca y cuando se levanta. Los
 * botones actúan al levantar. Si la pantalla se recompone al tocar, el destino
 * del dedo se mueve y la acción se pierde: hay que tocar dos veces y la app se
 * siente pesada.
 *
 * ## ⚠ La parte de contenedor está APARCADA
 *
 * `propsContenedor` y `propsElementoAbierto` implementan T1 —tocar fuera
 * cierra lo abierto— y están probadas, pero **hoy no se usan en ninguna
 * pantalla**.
 *
 * Se retiraron de la hoja de jornada después de tres intentos en los que
 * empeoraron el teclado: observar el toque a nivel contenedor obliga a
 * envolver la hoja en una vista propia, y esa vista pelea con el manejo de
 * teclado del bottom sheet. El síntoma en dispositivo fue un bloque gris del
 * tamaño del teclado y taps que aterrizaban en el elemento equivocado.
 *
 * Lo que queda en uso es `abrir`: abrir uno cierra el anterior, que es la
 * transición que de verdad ocurre. Compactar tocando el vacío es cosmético y
 * no vale lo que estaba costando.
 *
 * Quedan aquí, con sus pruebas, para cuando el layout esté estable.
 *
 * ## Lo que NO resuelve
 *
 * - Todo `ScrollView` con campos necesita `keyboardShouldPersistTaps="handled"`.
 * - `onBlur` **no debe cerrar por su cuenta**.
 *
 * ## Prueba de aceptación en dispositivo
 *
 * *Con un elemento abierto y el teclado visible, un solo tap sobre cualquier
 * botón lo ejecuta; y tocar dentro del elemento abierto no lo cierra.*
 */
export interface CierreDiferido {
  /** Id del elemento abierto, o `null`. */
  abierto: string | null;
  /** Abre uno. El anterior se cierra en el mismo gesto (T3). */
  abrir: (id: string) => void;
  /** Cierra ya, sin esperar al cuadro. */
  cerrar: () => void;
  /** Para esparcir en el `View` raíz de la superficie de captura. */
  propsContenedor: {
    onStartShouldSetResponderCapture: () => boolean;
    onTouchEnd: () => void;
  };
  /**
   * Para esparcir en el `View` raíz **del elemento abierto**.
   *
   * Es lo que vuelve utilizable su interior: sin esto, cualquier toque dentro
   * lo cierra, incluidos los de sus propios botones.
   */
  propsElementoAbierto: {
    onStartShouldSetResponderCapture: () => boolean;
  };
}

export function useCierreDiferido(): CierreDiferido {
  const [estado, despachar] = useReducer(reducir, estadoInicial);

  /**
   * El único puente con el reloj: cuando la máquina deja un cierre agendado,
   * se le da **un cuadro** antes de ejecutarlo.
   *
   * Ese cuadro es lo que permite que el `onPress` del botón corra primero. Si
   * en ese lapso alguien abre algo, la máquina lo nota por la generación y
   * descarta el cierre: aquí no hay ninguna decisión que tomar.
   */
  useEffect(() => {
    if (estado.cierreAgendadoEn === null) return;
    const cuadro = requestAnimationFrame(() =>
      despachar({ tipo: "cierrePendienteCorre" }),
    );
    return () => cancelAnimationFrame(cuadro);
  }, [estado.cierreAgendadoEn]);

  const abrir = useCallback((id: string) => despachar({ tipo: "abrir", id }), []);
  const cerrar = useCallback(() => despachar({ tipo: "cerrar" }), []);

  const propsContenedor = useMemo(
    () => ({
      // **Devuelve false siempre**: observa el toque, no se lo queda. Devolver
      // true aquí secuestraría el gesto y el botón de abajo nunca recibiría su
      // press — justo el defecto que esta regla existe para evitar.
      onStartShouldSetResponderCapture: () => {
        despachar({ tipo: "toqueInicia" });
        return false;
      },
      onTouchEnd: () => despachar({ tipo: "toqueTermina" }),
    }),
    [],
  );

  const propsElementoAbierto = useMemo(
    () => ({
      // Corre DESPUÉS de la captura de la raíz —la captura va de afuera hacia
      // adentro—, y por eso puede corregirla.
      onStartShouldSetResponderCapture: () => {
        despachar({ tipo: "toqueCaeDentro" });
        return false;
      },
    }),
    [],
  );

  return {
    abierto: estado.abierto,
    abrir,
    cerrar,
    propsContenedor,
    propsElementoAbierto,
  };
}

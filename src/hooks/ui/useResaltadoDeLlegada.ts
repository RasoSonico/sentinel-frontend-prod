import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated } from "react-native";

/**
 * Resaltado de llegada (ADR-006 F33).
 *
 * Marca por unos segundos el elemento que el usuario acaba de crear y luego lo
 * deja igual a los demás. Dice "este es el tuyo", no dice estado.
 *
 * Devuelve una intensidad de 1 a 0 para interpolar un color de FONDO. No
 * devuelve un estilo hecho a propósito: quien lo usa decide el tono —
 * `DesignTokens.colors.llegada` — y sobre qué fondo se apaga.
 *
 * `useNativeDriver` va en `false` porque `backgroundColor` no es una propiedad
 * que el hilo nativo pueda animar.
 */

export const MS_VISIBLE = 1500;
export const MS_DESVANECIDO = 1000;

export function useResaltadoDeLlegada(activo: boolean): Animated.Value {
  // `useState` con inicializador perezoso y no `useRef`: leer `.current` en
  // render es justo lo que el compilador de React señala, y aquí el valor se
  // necesita durante el render para interpolar el color.
  const [intensidad] = useState(() => new Animated.Value(0));

  /**
   * `null` mientras no se sabe. Arrancar suponiendo "no hay movimiento
   * reducido" encendería la animación un instante antes de la respuesta, que
   * es justo el parpadeo que esa preferencia pide evitar.
   */
  const [movimientoReducido, setMovimientoReducido] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((valor) => {
      if (vivo) setMovimientoReducido(valor);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!activo || movimientoReducido === null) return;

    intensidad.setValue(1);

    // Con movimiento reducido el tinte no se desvanece: se retira de golpe, en
    // el mismo momento en que habría terminado de desvanecerse. La duración
    // total se respeta para que la marca se alcance a leer igual.
    if (movimientoReducido) {
      const id = setTimeout(
        () => intensidad.setValue(0),
        MS_VISIBLE + MS_DESVANECIDO,
      );
      return () => clearTimeout(id);
    }

    const animacion = Animated.timing(intensidad, {
      toValue: 0,
      delay: MS_VISIBLE,
      duration: MS_DESVANECIDO,
      useNativeDriver: false,
    });
    animacion.start();
    return () => animacion.stop();
  }, [activo, movimientoReducido, intensidad]);

  return intensidad;
}

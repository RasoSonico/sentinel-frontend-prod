/**
 * El lienzo donde se traza la firma.
 *
 * ## Lo que lo hace fluido
 *
 * **El trazo no cruza el puente de JS.** Los puntos se acumulan en valores
 * compartidos de Reanimated y el `d` del `<Path>` se recalcula en el hilo de
 * UI. Acumularlos en estado de React y re-renderizar en cada movimiento tira
 * cuadros en Android de gama media —que es el teléfono del supervisor, no el
 * de quien programa— y el trazo se va quedando atrás del dedo. Hacia JS solo
 * cruza un aviso por trazo terminado, para habilitar el botón.
 *
 * **Se suaviza con curvas, no con rectas.** Ver `trazo.ts`: cada punto
 * capturado es el control de una cuadrática que acaba en el punto medio del
 * par siguiente. Es la diferencia entre una firma y una polilínea, y se nota
 * justo en los trazos rápidos, que es donde una firma los tiene.
 *
 * ## Los tres detalles de Android
 *
 * - `minDistance(0)`: por omisión un `Pan` espera a que el dedo recorra unos
 *   píxeles antes de activarse, y esos píxeles son el principio del trazo. Sin
 *   esto las firmas salen con el arranque cortado.
 * - `maxPointers(1)`: la palma apoyada en la pantalla abre un segundo trazo.
 * - `shouldCancelWhenOutside(false)`: un trazo que roza el borde no se aborta.
 *
 * Y el cuarto, que no es del gesto sino de dónde se pone esto: **va en
 * pantalla completa, no en una hoja inferior**. Un `@gorhom/bottom-sheet`
 * compite por el mismo gesto vertical y se lleva el trazo. Es el equivalente
 * en React Native del `touch-action: none` que hace falta en la web.
 */

import React, {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { DesignTokens } from 'src/styles/designTokens';
import {
  Geometria,
  MAX_PUNTOS,
  MAX_PUNTOS_POR_TRAZO,
  MAX_TRAZOS,
  Punto,
  Trazo,
  aPayload,
  caminoCompleto,
  caminoDeTrazo,
  grosorDePluma,
  vaLejos,
} from './trazo';

const PathAnimado = Animated.createAnimatedComponent(Path);

export interface LienzoFirmaRef {
  /** Borra todo. */
  limpiar: () => void;
  /** La geometría lista para mandar, o `null` si no hay nada trazado. */
  leer: () => Geometria | null;
}

interface Props {
  /** Alto del lienzo. El ancho lo toma del contenedor. */
  alto?: number;
  /** Se llama cuando pasa de vacío a con trazo y viceversa. */
  onHayTrazo?: (hay: boolean) => void;
  color?: string;
}

const LienzoFirma = React.forwardRef<LienzoFirmaRef, Props>(
  ({ alto = 240, onHayTrazo, color = DesignTokens.colors.executive.accent }, ref) => {
    const [medida, setMedida] = useState({ ancho: 0, alto });

    // ── Estado del hilo de UI ────────────────────────────────────────────
    // `terminados` guarda los trazos ya cerrados y `enCurso` el que se está
    // dibujando. Separarlos evita rearmar el camino de toda la firma en cada
    // movimiento del dedo: lo ya trazado no cambia.
    const terminados = useSharedValue<Trazo[]>([]);
    const enCurso = useSharedValue<Trazo>([]);
    const caminoFijo = useSharedValue('');
    const caminoVivo = useSharedValue('');

    // Copia en JS, solo para leerla al confirmar. No se usa para pintar.
    const [enJS, setEnJS] = useState<Trazo[]>([]);
    // Ref y no estado: solo sirve para no repetir el aviso, y como estado
    // forzaría un render de más por cada trazo terminado sin cambiar nada de
    // lo que se ve.
    const habia = useRef(false);

    const avisar = useCallback(
      (trazos: Trazo[]) => {
        setEnJS(trazos);
        const hay = trazos.length > 0;
        if (habia.current !== hay) {
          habia.current = hay;
          onHayTrazo?.(hay);
        }
      },
      [onHayTrazo]
    );

    const gesto = Gesture.Pan()
      .minDistance(0)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      // `runOnJS(false)` es el valor por omisión y es el que importa: el
      // manejador corre en el hilo de UI. Dejarlo escrito es documentación.
      .onBegin((evento) => {
        'worklet';
        if (terminados.value.length >= MAX_TRAZOS) return;
        enCurso.value = [[evento.x, evento.y] as Punto];
        caminoVivo.value = caminoDeTrazo(enCurso.value);
      })
      .onUpdate((evento) => {
        'worklet';
        const actual = enCurso.value;
        if (!actual.length) return;
        if (actual.length >= MAX_PUNTOS_POR_TRAZO) return;
        if (!vaLejos(actual[actual.length - 1], evento.x, evento.y)) return;

        // Se reasigna el arreglo en vez de empujar al que ya está: Reanimated
        // solo propaga el cambio cuando la referencia cambia, y un `push`
        // dejaría el trazo congelado en el último valor propagado.
        const siguiente = [...actual, [evento.x, evento.y] as Punto];
        enCurso.value = siguiente;
        caminoVivo.value = caminoDeTrazo(siguiente);
      })
      .onFinalize(() => {
        'worklet';
        const actual = enCurso.value;
        enCurso.value = [];
        caminoVivo.value = '';
        if (!actual.length) return;

        const total = terminados.value.reduce((n, t) => n + t.length, 0);
        if (total + actual.length > MAX_PUNTOS) return;

        const todos = [...terminados.value, actual];
        terminados.value = todos;
        caminoFijo.value = caminoCompleto(todos);
        runOnJS(avisar)(todos);
      });

    const propsFijo = useAnimatedProps(() => ({ d: caminoFijo.value }));
    const propsVivo = useAnimatedProps(() => ({ d: caminoVivo.value }));

    const limpiar = useCallback(() => {
      terminados.value = [];
      enCurso.value = [];
      caminoFijo.value = '';
      caminoVivo.value = '';
      avisar([]);
    }, [avisar, caminoFijo, caminoVivo, enCurso, terminados]);

    useImperativeHandle(
      ref,
      () => ({
        limpiar,
        leer: () => {
          if (!enJS.length || !medida.ancho) return null;
          return aPayload({
            ancho: medida.ancho,
            alto: medida.alto,
            trazos: enJS,
          });
        },
      }),
      [enJS, limpiar, medida]
    );

    const alMedir = useCallback((evento: LayoutChangeEvent) => {
      const { width, height } = evento.nativeEvent.layout;
      setMedida({ ancho: width, alto: height });
    }, []);

    const pluma = grosorDePluma(medida.ancho || 320, medida.alto);

    return (
      <GestureDetector gesture={gesto}>
        <View style={[estilos.lienzo, { height: alto }]} onLayout={alMedir}>
          <Svg width="100%" height="100%">
            {/* Dos caminos y no uno: lo ya trazado no se vuelve a armar en
                cada movimiento del dedo. */}
            <PathAnimado
              animatedProps={propsFijo}
              stroke={color}
              strokeWidth={pluma}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <PathAnimado
              animatedProps={propsVivo}
              stroke={color}
              strokeWidth={pluma}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      </GestureDetector>
    );
  }
);

LienzoFirma.displayName = 'LienzoFirma';

const estilos = StyleSheet.create({
  lienzo: {
    width: '100%',
    // Transparente: la raya guía se dibuja detrás del lienzo y un fondo
    // opaco la taparía.
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
});

export default LienzoFirma;

import { useCallback } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  setStatusBarBackgroundColor,
  setStatusBarStyle,
  type StatusBarStyle,
} from "expo-status-bar";

import { DesignTokens } from "src/styles/designTokens";

/**
 * El tono de los iconos de la barra de estado, por pantalla.
 *
 * ## El problema
 *
 * La barra de estado —reloj, señal, batería— es del sistema, y tanto su fondo
 * como el color de sus iconos son **un solo valor para toda la app**. Los
 * encabezados de SENTINEL no: tres tabs abren en azul marino y Perfil en
 * blanco. Cualquier valor fijo se pierde en la mitad de las pantallas: iconos
 * oscuros desaparecen sobre el azul, claros desaparecen sobre el blanco, y la
 * franja gris de Android se ve como un escalón encima del encabezado.
 *
 * ## La solución
 *
 * Fondo e iconos los declara **la pantalla**, que es la única que sabe de qué
 * color se pintó. Casi toda la app abre en azul marino —el login, los tres
 * stacks con encabezado, el armazón del wizard—, así que ése es el default y
 * vive en `App.tsx`. Las pantallas claras son la excepción y llaman aquí.
 *
 * En iOS el fondo no se toca: la barra siempre es transparente y deja ver lo
 * que haya detrás, que ya es el encabezado. El fondo es cosa de Android, y de
 * Android *sin* `edgeToEdgeEnabled` — ver el porqué en `app.config.ts`. Si
 * algún día se enciende, estas llamadas dejan de hacer efecto y el encabezado
 * se verá detrás de la barra por sí solo: el resultado es el mismo.
 *
 * ## Por qué al enfocar y no al montar
 *
 * En las tabs, la pantalla anterior sigue montada cuando entras a otra: React
 * Navigation no la desmonta al cambiar de tab. Un `<StatusBar>` puesto en el
 * render se aplicaría o no según el orden de montaje, que nadie controla, y
 * el tono quedaría al azar. `useFocusEffect` lo fija al enfocar y lo devuelve
 * al default al salir: la última pantalla enfocada siempre gana.
 *
 * @param encabezado El color del encabezado DE ESTA PANTALLA, no el de los
 *   iconos. Son opuestos —encabezado claro pide iconos oscuros— y es el error
 *   fácil de cometer, así que el parámetro nombra lo que se ve.
 */
export type ColorDeEncabezado = "claro" | "oscuro";

/** Iconos claros: casi toda la app abre en azul marino. */
export const TONO_POR_DEFECTO: StatusBarStyle = "light";

/** El azul de los encabezados, que es lo que la barra debe continuar. */
export const FONDO_POR_DEFECTO = DesignTokens.colors.executive.primary;

const BARRA: Record<
  ColorDeEncabezado,
  { tono: StatusBarStyle; fondo: string }
> = {
  claro: { tono: "dark", fondo: DesignTokens.colors.background.primary },
  oscuro: { tono: "light", fondo: FONDO_POR_DEFECTO },
};

/** No-op en iOS, y llamarlo ahí avisa en consola. */
const pintarFondo = (color: string) => {
  if (Platform.OS === "android") setStatusBarBackgroundColor(color);
};

export const useBarraDeEstado = (encabezado: ColorDeEncabezado) => {
  useFocusEffect(
    useCallback(() => {
      const { tono, fondo } = BARRA[encabezado];
      setStatusBarStyle(tono);
      pintarFondo(fondo);
      return () => {
        setStatusBarStyle(TONO_POR_DEFECTO);
        pintarFondo(FONDO_POR_DEFECTO);
      };
    }, [encabezado]),
  );
};

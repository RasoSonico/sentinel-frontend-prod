import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";
import { fs, sp } from "src/styles/escala";

/**
 * Las cuatro secciones de la captura, con su progreso (ADR-006 D2, F44).
 *
 * **Se toca para ir.** Nació como indicador de progreso de un recorrido
 * lineal, y el campo mostró que el recorrido no es lineal: los supervisores
 * entran y salen de Actividades, Fotos y Observaciones conforme avanza la
 * jornada. La cinta ya pintaba dónde estaban y a dónde podían ir; lo único que
 * faltaba era dejarlos tocarla.
 *
 * Gramática de color del módulo: **cyan `primary[500]` es el acento** —
 * palomitas y línea de progreso—, el navy marca el paso activo, y el gris lo
 * que aún no se toca. El verde NO aparece aquí: está reservado a un solo botón
 * en todo el módulo ("Guardar reporte"), y usarlo también para el progreso le
 * quitaría a ese botón el peso que lo hace inconfundible.
 */

export const PASOS = ["Activid.", "Fotos", "Observ.", "Revisión"] as const;

interface Props {
  /** 0-based: la sección que se está mostrando. */
  actual: number;
  /** Índices ya completados; pintan palomita. */
  completados: number[];
  /** Ir a esa sección. Sin esto la cinta es solo un indicador. */
  onIr?: (indice: number) => void;
}

export function WizardStepper({ actual, completados, onIr }: Props) {
  return (
    <View style={estilos.raiz}>
      {PASOS.map((etiqueta, indice) => {
        const completado = completados.includes(indice);
        const activo = indice === actual;
        const previoCompletado = completados.includes(indice - 1);

        return (
          // El área tocable es el cuarto entero de la cinta, líneas incluidas:
          // el punto mide 20 px y pedir puntería sobre eso, en un teléfono y
          // con guantes, es pedir que no lo usen.
          <Pressable
            key={etiqueta}
            onPress={onIr ? () => onIr(indice) : undefined}
            disabled={!onIr || activo}
            accessibilityRole="button"
            accessibilityLabel={`Ir a ${etiqueta}`}
            accessibilityState={{ selected: activo }}
            style={({ pressed }) => [
              estilos.paso,
              pressed && estilos.pasoPresionado,
            ]}
          >
            {indice > 0 ? (
              <View
                style={[
                  estilos.linea,
                  previoCompletado && estilos.lineaCompletada,
                ]}
              />
            ) : (
              <View style={estilos.lineaFantasma} />
            )}

            <View style={estilos.centro}>
              <View
                style={[
                  estilos.punto,
                  completado && estilos.puntoCompletado,
                  activo && estilos.puntoActivo,
                ]}
              >
                {completado ? (
                  <Ionicons
                    name="checkmark"
                    size={fs(12)}
                    color={DesignTokens.colors.background.primary}
                  />
                ) : null}
              </View>
              <Text
                style={[estilos.etiqueta, activo && estilos.etiquetaActiva]}
                numberOfLines={1}
              >
                {etiqueta}
              </Text>
            </View>

            {indice < PASOS.length - 1 ? (
              <View
                style={[estilos.linea, completado && estilos.lineaCompletada]}
              />
            ) : (
              <View style={estilos.lineaFantasma} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const PUNTO = 20;

const estilos = StyleSheet.create({
  raiz: {
    flexDirection: "row",
    paddingVertical: sp(12),
    paddingHorizontal: sp(8),
    backgroundColor: DesignTokens.colors.background.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  paso: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  pasoPresionado: { opacity: 0.6 },
  centro: {
    alignItems: "center",
  },
  // Las medias líneas de los extremos se dibujan transparentes en vez de
  // omitirse: así los cuatro pasos conservan el mismo ancho y los puntos no
  // bailan de posición según cuál sea el primero o el último.
  lineaFantasma: {
    flex: 1,
    height: 2,
  },
  linea: {
    flex: 1,
    height: 2,
    backgroundColor: DesignTokens.colors.neutral[200],
  },
  lineaCompletada: {
    backgroundColor: DesignTokens.colors.primary[500],
  },
  punto: {
    width: sp(PUNTO),
    height: sp(PUNTO),
    borderRadius: sp(PUNTO) / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DesignTokens.colors.neutral[300],
  },
  puntoCompletado: {
    backgroundColor: DesignTokens.colors.primary[500],
  },
  puntoActivo: {
    backgroundColor: DesignTokens.colors.executive.primary,
  },
  etiqueta: {
    marginTop: sp(4),
    fontSize: fs(9.5),
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    ...(Platform.OS === "android"
      ? { includeFontPadding: false, textAlignVertical: "center" as const }
      : {}),
  },
  etiquetaActiva: {
    color: DesignTokens.colors.executive.primary,
  },
});

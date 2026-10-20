import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";
import { fs, sp } from "src/styles/escala";

/**
 * Los cuatro pasos del wizard, con su progreso (ADR-006, D2).
 *
 * Gramática de color del módulo: **cyan `primary[500]` es el acento** —
 * palomitas y línea de progreso—, el navy marca el paso activo, y el gris lo
 * que aún no se toca. El verde NO aparece aquí: está reservado a un solo botón
 * en todo el módulo ("Guardar reporte"), y usarlo también para el progreso le
 * quitaría a ese botón el peso que lo hace inconfundible.
 */

export const PASOS = ["Activid.", "Fotos", "Observ.", "Revisión"] as const;

interface Props {
  /** 0-based: el paso que se está mostrando. */
  actual: number;
  /** Índices ya completados; pintan palomita. */
  completados: number[];
}

export function WizardStepper({ actual, completados }: Props) {
  return (
    <View style={estilos.raiz}>
      {PASOS.map((etiqueta, indice) => {
        const completado = completados.includes(indice);
        const activo = indice === actual;
        const previoCompletado = completados.includes(indice - 1);

        return (
          <View key={etiqueta} style={estilos.paso}>
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
          </View>
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

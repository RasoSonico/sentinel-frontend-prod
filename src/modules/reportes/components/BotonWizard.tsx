import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

/**
 * Botón del pie del wizard.
 *
 * La gramática de color del módulo (ADR-006, D2) vive aquí, en un solo sitio:
 *
 *   navy     navegación (Siguiente)
 *   contorno navegación secundaria (Atrás)
 *   verde    **solo** "Guardar reporte" — un botón en todo el módulo
 *   rojo     eliminar
 *
 * Que el verde exista únicamente en la variante `guardar` es lo que hace ese
 * botón inconfundible. En cuanto el verde se usara también para "Siguiente",
 * el gesto de guardar perdería su peso.
 */

export type VarianteBoton = "navy" | "contorno" | "guardar" | "peligro";

interface Props {
  etiqueta: string;
  onPress: () => void;
  variante?: VarianteBoton;
  deshabilitado?: boolean;
  cargando?: boolean;
  /** Ocupa todo el ancho disponible del pie. */
  ancho?: boolean;
}

export function BotonWizard({
  etiqueta,
  onPress,
  variante = "navy",
  deshabilitado = false,
  cargando = false,
  ancho = false,
}: Props) {
  const inactivo = deshabilitado || cargando;
  const esContorno = variante === "contorno";

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        estilos.base,
        ancho ? estilos.ancho : estilos.flexible,
        estilosPorVariante[variante],
        inactivo && (esContorno ? estilos.contornoInactivo : estilos.inactivo),
        pressed && !inactivo && estilos.presionado,
      ]}
    >
      <View style={estilos.contenido}>
        {cargando ? (
          <ActivityIndicator
            size="small"
            color={
              esContorno
                ? DesignTokens.colors.executive.primary
                : DesignTokens.colors.background.primary
            }
          />
        ) : null}
        <Text
          style={[
            estilos.texto,
            esContorno ? estilos.textoContorno : estilos.textoSolido,
            inactivo && estilos.textoInactivo,
          ]}
          numberOfLines={1}
        >
          {etiqueta}
        </Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: sp(48),
    borderRadius: DesignTokens.borderRadius.base,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: sp(16),
    ...DesignTokens.shadows.sm,
  },
  // `flexible` va en pies de página EN FILA, donde `flex: 1` (base 0) reparte
  // el ancho en partes iguales entre dos botones. Es lo que se quiere ahí.
  flexible: { flex: 1 },
  // `ancho` es distinto: se usa dentro de contenedores EN COLUMNA y de alto
  // automático. Con `flex: 1` la base es 0, el contenedor reserva CERO alto
  // para el botón, y el botón se dibuja igual con sus 48 px de `minHeight`
  // desbordando por abajo — medio botón bajo la barra del sistema, o fuera de
  // la tarjeta de un modal. `flexGrow` deja la base en `auto`: el contenedor
  // reserva los 48, no sobra espacio, y no crece. En fila sigue ocupando todo
  // el ancho, que es el otro uso.
  ancho: { alignSelf: "stretch", flexGrow: 1 },
  contenido: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(8),
  },
  presionado: { opacity: 0.85 },
  inactivo: {
    backgroundColor: DesignTokens.colors.neutral[200],
    shadowOpacity: 0,
    elevation: 0,
  },
  contornoInactivo: {
    borderColor: DesignTokens.colors.neutral[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  texto: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.base), 1.2),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    ...(Platform.OS === "android"
      ? { includeFontPadding: false, textAlignVertical: "center" as const }
      : {}),
  },
  textoSolido: { color: DesignTokens.colors.background.primary },
  textoContorno: { color: DesignTokens.colors.executive.primary },
  textoInactivo: { color: DesignTokens.colors.neutral[500] },
});

const estilosPorVariante = StyleSheet.create({
  navy: { backgroundColor: DesignTokens.colors.executive.primary },
  contorno: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: DesignTokens.colors.executive.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  guardar: { backgroundColor: DesignTokens.colors.success[600] },
  peligro: { backgroundColor: DesignTokens.colors.error[600] },
});

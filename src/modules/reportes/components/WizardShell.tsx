import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";
import { fechaLargaConDia } from "src/modules/avance/utils/fechaPrograma";

/**
 * Armazón compartido por P-00 y los cuatro pasos del wizard (ADR-006, D1 y D2).
 *
 * Que la selección de proveedores use el MISMO armazón que los pasos no es
 * ahorro de código: es lo que hace que P-00 se lea como el primer cuarto del
 * mismo flujo y no como un trámite aparte que hay que superar antes de empezar.
 *
 * La **fecha va de solo lectura**, sin selector. Es presión de diseño hacia la
 * captura en campo: un selector legitimaría "lo lleno el domingo por los cinco
 * días", que es exactamente el hábito que este módulo existe para romper.
 */

interface Props {
  titulo: string;
  obra: string;
  /** `YYYY-MM-DD` del día que documenta el reporte. */
  fechaReporte: string;
  onCerrar: () => void;
  children: React.ReactNode;
  /** Barra inferior: botones de navegación del paso. */
  pie?: React.ReactNode;
  /** Stepper u otra cinta entre el subheader y el contenido. */
  cinta?: React.ReactNode;
}

export function WizardShell({
  titulo,
  obra,
  fechaReporte,
  onCerrar,
  children,
  pie,
  cinta,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={estilos.raiz}>
      <View style={[estilos.header, { paddingTop: insets.top + sp(8) }]}>
        <Pressable
          onPress={onCerrar}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Cerrar y descartar el reporte"
          style={estilos.cerrar}
        >
          <Ionicons
            name="close"
            size={fs(24)}
            color={DesignTokens.colors.background.primary}
          />
        </Pressable>
        <Text style={estilos.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        {/* Espejo del ✕ para que el título quede centrado de verdad. */}
        <View style={estilos.cerrar} />
      </View>

      <View style={estilos.subheader}>
        <Text style={estilos.obra} numberOfLines={2}>
          {obra}
        </Text>
        <Text style={estilos.fecha}>
          Fecha del reporte:{" "}
          <Text style={estilos.fechaValor}>{fechaLargaConDia(fechaReporte)}</Text>
        </Text>
      </View>

      {cinta}

      <View style={estilos.contenido}>{children}</View>

      {pie ? (
        <View
          style={[
            estilos.pie,
            // Los insets inferiores los respeta el pie, no el contenido: es lo
            // que queda pegado al borde en teléfonos con barra de gestos.
            { paddingBottom: Math.max(insets.bottom, sp(12)) },
          ]}
        >
          {pie}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sp(16),
    paddingBottom: sp(12),
    backgroundColor: DesignTokens.colors.executive.primary,
  },
  cerrar: {
    width: fs(32),
    height: fs(32),
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    flex: 1,
    textAlign: "center",
    color: DesignTokens.colors.background.primary,
    fontSize: fs(DesignTokens.typography.fontSize.lg),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.lg), 1.2),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  subheader: {
    paddingHorizontal: sp(16),
    paddingVertical: sp(12),
    backgroundColor: DesignTokens.colors.executive.secondary,
  },
  obra: {
    color: DesignTokens.colors.background.primary,
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  fecha: {
    marginTop: sp(4),
    color: DesignTokens.colors.neutral[300],
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.xs)),
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  fechaValor: {
    color: DesignTokens.colors.background.primary,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  contenido: {
    flex: 1,
  },
  pie: {
    flexDirection: "row",
    gap: sp(12),
    paddingHorizontal: sp(16),
    paddingTop: sp(12),
    backgroundColor: DesignTokens.colors.background.primary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
});

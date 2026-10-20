import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

/**
 * Menú de opción única presentado como hoja inferior.
 *
 * **Hermano de `AnchoredMenu`, no una variante suya.** Comparten la disciplina
 * de overlay —`Modal` transparente, telón que cierra al tocar fuera, cierre por
 * botón atrás— pero no el layout: `AnchoredMenu` existe para tener el ancho
 * exacto del botón que lo abrió y la punta que lo conecta con él, y abre hacia
 * arriba porque vive al pie de la pantalla. Nada de eso aplica a una lista de
 * siete opciones que debe caber completa sin desplazarse. Meter las dos
 * presentaciones en un componente costaría cuatro condicionales para dos
 * layouts que no comparten una sola medida.
 *
 * Se usa cuando la lista es larga y la elección es exclusiva: la hoja aparece
 * desde el borde inferior con todo a la vista, en lugar de anclarse a un campo
 * y empujar la lista fuera de la ventana.
 */

export interface OpcionHoja {
  clave: string;
  etiqueta: string;
}

interface Props {
  visible: boolean;
  /** Encabezado de la hoja: qué se está eligiendo. */
  titulo: string;
  opciones: readonly OpcionHoja[];
  /** Clave marcada; `null` mientras no hay elección. */
  seleccionada: string | null;
  onSeleccionar: (clave: string) => void;
  onCerrar: () => void;
}

export function BottomSheetMenu({
  visible,
  titulo,
  opciones,
  seleccionada,
  onSeleccionar,
  onCerrar,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
    >
      {/* El telón cierra al tocar fuera: es el gesto que la gente ya espera
          de una hoja inferior. */}
      <Pressable style={estilos.telon} onPress={onCerrar} />

      <View style={[estilos.hoja, { paddingBottom: insets.bottom + sp(12) }]}>
        {/* El asa no arrastra —la hoja se cierra por telón o por elección— pero
            es la señal que dice "esto vino de abajo y se va hacia abajo". */}
        <View style={estilos.asa} />
        <Text style={estilos.titulo}>{titulo}</Text>

        <ScrollView bounces={false}>
          {opciones.map((opcion) => {
            const marcada = opcion.clave === seleccionada;
            return (
              <Pressable
                key={opcion.clave}
                onPress={() => {
                  onSeleccionar(opcion.clave);
                  onCerrar();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: marcada }}
                accessibilityLabel={opcion.etiqueta}
                style={({ pressed }) => [
                  estilos.opcion,
                  marcada && estilos.opcionMarcada,
                  pressed && !marcada && estilos.presionada,
                ]}
              >
                <Text
                  style={[estilos.etiqueta, marcada && estilos.etiquetaMarcada]}
                >
                  {opcion.etiqueta}
                </Text>
                {marcada ? (
                  <Ionicons
                    name="checkmark"
                    size={fs(18)}
                    color={DesignTokens.colors.primary[500]}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  telon: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.32)",
  },
  hoja: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "72%",
    borderTopLeftRadius: sp(16),
    borderTopRightRadius: sp(16),
    backgroundColor: DesignTokens.colors.background.primary,
    paddingTop: sp(8),
    ...DesignTokens.shadows.lg,
  },
  asa: {
    width: sp(34),
    height: sp(4),
    borderRadius: sp(2),
    backgroundColor: DesignTokens.colors.neutral[200],
    alignSelf: "center",
    marginBottom: sp(8),
  },
  titulo: {
    paddingHorizontal: sp(18),
    paddingBottom: sp(8),
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  opcion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: sp(12),
    minHeight: sp(48),
    paddingHorizontal: sp(18),
  },
  opcionMarcada: { backgroundColor: DesignTokens.colors.primary[50] },
  presionada: { backgroundColor: DesignTokens.colors.neutral[100] },
  etiqueta: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.base),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.base), 1.2),
    color: DesignTokens.colors.neutral[800],
    ...sinPaddingAndroid,
  },
  etiquetaMarcada: {
    color: DesignTokens.colors.primary[600],
    fontWeight: DesignTokens.typography.fontWeight.bold,
  },
});

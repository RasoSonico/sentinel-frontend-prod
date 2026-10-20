import React, { useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

import type { ActividadBorrador } from "../state/BorradorReporteContext";
import { useBorradorReporte } from "../state/BorradorReporteContext";

/**
 * Paso 1 · Actividades (ADR-006, Decisión 3).
 *
 * Lista blanca agrupada arriba, bloque punteado de creación abajo. La
 * composición ocurre en **pantalla propia**: las actividades reales son
 * párrafos con referencias normativas, y un input inline en la fila quedaría
 * ilegible.
 *
 * **El numeral es posición calculada, nunca dato.** Se pinta a partir del
 * índice; lo que se persiste es `orden`. Guardar el número impreso obligaría a
 * renumerar N filas en cada borrado, con riesgo de estados inconsistentes al
 * sincronizar desde una cola offline.
 */

interface Props {
  onEditar: (actividadId?: string) => void;
}

export function ActividadesStep({ onEditar }: Props) {
  const { borrador } = useBorradorReporte();
  const { actividades } = borrador;

  const renderFila = useCallback(
    ({ item, index }: { item: ActividadBorrador; index: number }) => (
      <Pressable
        onPress={() => onEditar(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Actividad ${index + 1}: ${item.texto}`}
        style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
      >
        <Text style={estilos.numeral}>
          {String(index + 1).padStart(2, "0")}
        </Text>
        <Text style={estilos.texto} numberOfLines={3}>
          {item.texto}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={fs(18)}
          color={DesignTokens.colors.neutral[400]}
        />
      </Pressable>
    ),
    [onEditar],
  );

  return (
    <FlatList
      data={actividades}
      keyExtractor={(item) => item.id}
      renderItem={renderFila}
      contentContainerStyle={estilos.lista}
      ListHeaderComponent={
        <View style={estilos.encabezado}>
          <Text style={estilos.etiquetaGrupo}>Actividades del día</Text>
          <View style={estilos.contadorPastilla}>
            <Text style={estilos.contador}>{actividades.length}</Text>
          </View>
        </View>
      }
      ListFooterComponent={
        // Bloque punteado de creación. La pastilla anticipa el número que
        // tomará la actividad: es la señal de continuidad de la lista.
        <Pressable
          onPress={() => onEditar(undefined)}
          accessibilityRole="button"
          accessibilityLabel="Escribir una actividad nueva"
          style={({ pressed }) => [
            estilos.bloqueCreacion,
            pressed && estilos.presionada,
          ]}
        >
          <View style={estilos.pastillaNumero}>
            <Text style={estilos.numeroSiguiente}>
              {String(actividades.length + 1).padStart(2, "0")}
            </Text>
          </View>
          <Text style={estilos.textoCreacion}>
            {actividades.length === 0
              ? "Escribir la primera actividad"
              : "Escribir la siguiente actividad"}
          </Text>
          <Ionicons
            name="add"
            size={fs(22)}
            color={DesignTokens.colors.primary[600]}
          />
        </Pressable>
      }
    />
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  lista: {
    padding: sp(16),
    paddingBottom: sp(24),
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(8),
    marginBottom: sp(10),
  },
  etiquetaGrupo: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  contadorPastilla: {
    minWidth: sp(22),
    paddingHorizontal: sp(6),
    paddingVertical: sp(1),
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
  },
  contador: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[700],
    ...sinPaddingAndroid,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(12),
    paddingHorizontal: sp(14),
    paddingVertical: sp(12),
    marginBottom: sp(8),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    ...DesignTokens.shadows.sm,
  },
  presionada: { opacity: 0.85 },
  numeral: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[400],
    ...sinPaddingAndroid,
  },
  texto: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.base),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.base)),
    color: DesignTokens.colors.neutral[800],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  bloqueCreacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(12),
    paddingHorizontal: sp(14),
    paddingVertical: sp(14),
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: DesignTokens.colors.primary[300],
    backgroundColor: DesignTokens.colors.primary[50],
  },
  pastillaNumero: {
    minWidth: sp(28),
    paddingHorizontal: sp(8),
    paddingVertical: sp(3),
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.primary[500],
    alignItems: "center",
  },
  numeroSiguiente: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.background.primary,
    ...sinPaddingAndroid,
  },
  textoCreacion: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.primary[700],
    ...sinPaddingAndroid,
  },
});

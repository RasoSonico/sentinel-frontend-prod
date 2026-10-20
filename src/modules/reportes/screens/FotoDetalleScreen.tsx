import React, { useCallback } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DesignTokens } from "src/styles/designTokens";
import { fs, sp } from "src/styles/escala";

import { MAX_CARACTERES_PIE } from "../constantes";
import { useBorradorReporte } from "../state/BorradorReporteContext";

/**
 * Detalle de una foto ya en el reporte (ADR-006, Decisión 4).
 *
 * Imagen grande, su pie editable y "Quitar foto". Es la ruta para corregir una
 * foto puntual después de que su tanda ya se cerró; el carrusel es para el
 * momento de la captura.
 */

interface Props {
  fotoId: string;
  onCerrar: () => void;
}

export function FotoDetalleScreen({ fotoId, onCerrar }: Props) {
  const insets = useSafeAreaInsets();
  const { borrador, setPieDeFoto, eliminarFoto } = useBorradorReporte();

  const indice = borrador.fotos.findIndex((f) => f.id === fotoId);
  const foto = indice >= 0 ? borrador.fotos[indice] : null;

  const quitar = useCallback(() => {
    Alert.alert(
      "Quitar la fotografía",
      "Se quitará del reporte junto con su pie de foto.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: () => {
            eliminarFoto(fotoId);
            onCerrar();
          },
        },
      ],
    );
  }, [fotoId, eliminarFoto, onCerrar]);

  if (!foto) return null;

  const sinPie = foto.pie.trim().length === 0;

  return (
    <KeyboardAvoidingView
      style={estilos.raiz}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[estilos.header, { paddingTop: insets.top + sp(8) }]}>
        <Pressable
          onPress={onCerrar}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver a la lista de fotografías"
          style={estilos.iconoHeader}
        >
          <Ionicons
            name="chevron-back"
            size={fs(24)}
            color={DesignTokens.colors.background.primary}
          />
        </Pressable>
        <Text style={estilos.tituloHeader}>Foto {indice + 1}</Text>
        <View style={estilos.iconoHeader} />
      </View>

      <ScrollView
        contentContainerStyle={estilos.cuerpo}
        keyboardShouldPersistTaps="handled"
      >
        <Image source={{ uri: foto.localUri }} style={estilos.imagen} />

        <View style={estilos.etiquetaFila}>
          <Text style={estilos.etiqueta}>Pie de foto · obligatorio</Text>
          <Text
            style={[
              estilos.conteo,
              foto.pie.length >= MAX_CARACTERES_PIE && estilos.conteoTope,
            ]}
          >
            {foto.pie.length} / {MAX_CARACTERES_PIE}
          </Text>
        </View>
        <TextInput
          value={foto.pie}
          onChangeText={(texto) => setPieDeFoto(fotoId, texto)}
          maxLength={MAX_CARACTERES_PIE}
          placeholder="Personal con arnés y línea de vida"
          placeholderTextColor={DesignTokens.colors.neutral[400]}
          style={[estilos.input, sinPie && estilos.inputFaltante]}
        />
        {sinPie ? (
          <Text style={estilos.avisoPie}>
            Sin pie de foto no se puede guardar el reporte.
          </Text>
        ) : null}

        <Pressable
          onPress={quitar}
          accessibilityRole="button"
          style={({ pressed }) => [
            estilos.quitar,
            pressed && estilos.presionado,
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={fs(18)}
            color={DesignTokens.colors.error[600]}
          />
          <Text style={estilos.textoQuitar}>Quitar foto</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: DesignTokens.colors.background.secondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sp(16),
    paddingBottom: sp(12),
    backgroundColor: DesignTokens.colors.executive.primary,
  },
  iconoHeader: {
    width: fs(32),
    height: fs(32),
    alignItems: "center",
    justifyContent: "center",
  },
  tituloHeader: {
    flex: 1,
    textAlign: "center",
    color: DesignTokens.colors.background.primary,
    fontSize: fs(DesignTokens.typography.fontSize.lg),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    ...sinPaddingAndroid,
  },
  cuerpo: { padding: sp(16), gap: sp(8) },
  imagen: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.neutral[200],
    resizeMode: "cover",
    marginBottom: sp(8),
  },
  etiquetaFila: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  etiqueta: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  conteo: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  conteoTope: {
    color: DesignTokens.colors.warning[700],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  input: {
    minHeight: sp(48),
    paddingHorizontal: sp(14),
    paddingVertical: sp(10),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    fontSize: fs(DesignTokens.typography.fontSize.base),
    color: DesignTokens.colors.neutral[900],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  inputFaltante: { borderColor: DesignTokens.colors.warning[400] },
  avisoPie: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.warning[700],
    ...sinPaddingAndroid,
  },
  quitar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp(8),
    marginTop: sp(24),
    paddingVertical: sp(12),
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1,
    borderColor: DesignTokens.colors.error[200],
    backgroundColor: DesignTokens.colors.error[50],
  },
  textoQuitar: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.error[600],
    ...sinPaddingAndroid,
  },
  presionado: { opacity: 0.85 },
});

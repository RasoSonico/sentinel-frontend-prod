import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

import { useBorradorReporte } from "../state/BorradorReporteContext";

/**
 * Paso 3 · Observaciones (ADR-006, Decisión 5). **El paso es el campo.**
 *
 * **El campo se llama `conclusion` en el borrador, en la cola, en la API y en
 * la base.** Los Coordinadores pidieron renombrar el rótulo a "Observaciones"
 * (14-sep-2026) y se decidió que fuera solo eso: cambiar el nombre interno
 * habría costado una migración, un cambio de contrato y reescribir los
 * snapshots ya guardados en `versionado`, a cambio de nada que el usuario vea.
 *
 * Sin subpantalla: es un texto único, y darle navegación de
 * entrada y salida sería ceremonia sin contenido.
 *
 * **Sin límite de caracteres**, a diferencia del pie de foto. El pie tiene un
 * tope porque su ancho impreso es fijo; las observaciones fluyen en el documento con
 * el motor de cursor y crece las filas que necesite.
 *
 * El campo crece hasta ~6 renglones y después hace scroll interno (patrón
 * WhatsApp). **El teclado CUBRE el pie de navegación en vez de empujarlo**: eso
 * mantiene la máxima superficie de texto visible mientras se escribe, que es
 * justo cuando más se necesita. En iOS es el comportamiento natural; en Android
 * lo da `softwareKeyboardLayoutMode: "pan"` en la configuración de la app — el
 * default `resize` hace exactamente lo contrario.
 */

const RENGLONES_ANTES_DE_SCROLL = 6;

export function ConclusionStep() {
  const { borrador, setConclusion } = useBorradorReporte();

  const alturaLinea = lh(fs(DesignTokens.typography.fontSize.base));

  return (
    <ScrollView
      contentContainerStyle={estilos.cuerpo}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={estilos.etiqueta}>
        Observaciones del día{" "}
        <Text style={estilos.opcional}>opcional</Text>
      </Text>

      <TextInput
        value={borrador.conclusion}
        onChangeText={setConclusion}
        multiline
        textAlignVertical="top"
        placeholder="Se observó acumulación de material en el acceso poniente. Se indicó al contratista retirarlo antes del siguiente turno."
        placeholderTextColor={DesignTokens.colors.neutral[400]}
        style={[
          estilos.input,
          { maxHeight: alturaLinea * RENGLONES_ANTES_DE_SCROLL + sp(28) },
        ]}
      />

      <Text style={estilos.pista}>
        Puedes dejarla en blanco; entonces el documento no imprime la sección.
        Sin límite de largo · crece hasta ~{RENGLONES_ANTES_DE_SCROLL} renglones
        y luego hace scroll
      </Text>
    </ScrollView>
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  cuerpo: { padding: sp(16), gap: sp(8) },
  etiqueta: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  opcional: {
    color: DesignTokens.colors.neutral[400],
    fontWeight: DesignTokens.typography.fontWeight.normal,
    textTransform: "none",
    letterSpacing: 0,
  },
  input: {
    minHeight: sp(140),
    padding: sp(14),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    fontSize: fs(DesignTokens.typography.fontSize.base),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.base)),
    color: DesignTokens.colors.neutral[900],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  pista: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
});

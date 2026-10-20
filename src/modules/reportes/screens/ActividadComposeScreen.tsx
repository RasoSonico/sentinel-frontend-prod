import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
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
import { fs, lh, sp } from "src/styles/escala";

import { useBorradorReporte } from "../state/BorradorReporteContext";

/**
 * Composición de una actividad, en pantalla propia (ADR-006, Decisión 3).
 *
 * **"Guardar y escribir la siguiente" solo aparece al CREAR.** Ataca el patrón
 * de uso dominante: el supervisor no escribe una actividad, escribe la lista
 * del día de corrido. Sin ese botón, cada actividad cuesta dos toques de
 * navegación extra. Al editar no tiene sentido — no hay una "siguiente" en ese
 * contexto, y ofrecerla invitaría a crear renglones por accidente.
 *
 * Sin límite de caracteres: las actividades reales llevan referencias
 * normativas encadenadas, y el motor del documento las envuelve en las filas
 * que midan.
 */

interface Props {
  /** Ausente = creando. Presente = editando esa actividad. */
  actividadId?: string;
  onCerrar: () => void;
  /** Vuelve a la lista tras guardar. */
  onGuardado: () => void;
}

export function ActividadComposeScreen({
  actividadId,
  onCerrar,
  onGuardado,
}: Props) {
  const insets = useSafeAreaInsets();
  const {
    borrador,
    agregarActividad,
    editarActividad,
    eliminarActividad,
  } = useBorradorReporte();

  const editando = actividadId !== undefined;
  const indice = borrador.actividades.findIndex((a) => a.id === actividadId);
  const existente = indice >= 0 ? borrador.actividades[indice] : null;

  const [texto, setTexto] = useState(existente?.texto ?? "");
  const inputRef = useRef<TextInput>(null);

  const numeral = editando ? indice + 1 : borrador.actividades.length + 1;
  const hayTexto = texto.trim().length > 0;

  const guardar = useCallback(() => {
    if (!hayTexto) return;
    if (editando && actividadId) editarActividad(actividadId, texto);
    else agregarActividad(texto);
    onGuardado();
  }, [
    hayTexto,
    editando,
    actividadId,
    texto,
    editarActividad,
    agregarActividad,
    onGuardado,
  ]);

  const guardarYSeguir = useCallback(() => {
    if (!hayTexto) return;
    agregarActividad(texto);
    // Se queda en la misma pantalla con el campo limpio: el usuario sigue
    // escribiendo sin pasar por la lista.
    setTexto("");
    inputRef.current?.focus();
  }, [hayTexto, agregarActividad, texto]);

  const cerrar = useCallback(() => {
    const cambio = texto.trim() !== (existente?.texto ?? "");
    if (!cambio) {
      onCerrar();
      return;
    }
    Alert.alert(
      "Descartar los cambios",
      "Se perderá lo que escribiste en esta actividad.",
      [
        { text: "Seguir escribiendo", style: "cancel" },
        { text: "Descartar", style: "destructive", onPress: onCerrar },
      ],
    );
  }, [texto, existente, onCerrar]);

  const eliminar = useCallback(() => {
    if (!actividadId) return;
    Alert.alert(
      "Eliminar la actividad",
      "Esta actividad se quitará del reporte.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            eliminarActividad(actividadId);
            onGuardado();
          },
        },
      ],
    );
  }, [actividadId, eliminarActividad, onGuardado]);

  return (
    <KeyboardAvoidingView
      style={estilos.raiz}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[estilos.header, { paddingTop: insets.top + sp(8) }]}>
        <Pressable
          onPress={cerrar}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver sin guardar"
          style={estilos.iconoHeader}
        >
          <Ionicons
            name="chevron-back"
            size={fs(24)}
            color={DesignTokens.colors.background.primary}
          />
        </Pressable>
        <Text style={estilos.tituloHeader} numberOfLines={1}>
          Actividad {String(numeral).padStart(2, "0")}
        </Text>
        <Pressable
          onPress={guardar}
          disabled={!hayTexto}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Guardar la actividad"
          accessibilityState={{ disabled: !hayTexto }}
        >
          <Text
            style={[estilos.guardarHeader, !hayTexto && estilos.inactivo]}
          >
            Guardar
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={estilos.cuerpo}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={estilos.etiqueta}>Descripción de la actividad</Text>
        <TextInput
          ref={inputRef}
          value={texto}
          onChangeText={setTexto}
          multiline
          autoFocus
          textAlignVertical="top"
          placeholder="Personal sobre pipa de agua portando arnés y línea de vida en maniobra de llenado…"
          placeholderTextColor={DesignTokens.colors.neutral[400]}
          style={estilos.input}
        />
        <Text style={estilos.pista}>Sin límite de caracteres</Text>

        {editando ? (
          <Pressable
            onPress={eliminar}
            accessibilityRole="button"
            style={({ pressed }) => [
              estilos.eliminar,
              pressed && estilos.presionado,
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={fs(18)}
              color={DesignTokens.colors.error[600]}
            />
            <Text style={estilos.textoEliminar}>Eliminar actividad</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {!editando ? (
        <View
          style={[
            estilos.pie,
            { paddingBottom: Math.max(insets.bottom, sp(12)) },
          ]}
        >
          <Pressable
            onPress={guardarYSeguir}
            disabled={!hayTexto}
            accessibilityRole="button"
            accessibilityState={{ disabled: !hayTexto }}
            style={({ pressed }) => [
              estilos.botonSeguir,
              !hayTexto && estilos.botonInactivo,
              pressed && hayTexto && estilos.presionado,
            ]}
          >
            <Text
              style={[
                estilos.textoSeguir,
                !hayTexto && estilos.textoSeguirInactivo,
              ]}
            >
              Guardar y escribir la siguiente
            </Text>
          </Pressable>
        </View>
      ) : null}
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
    gap: sp(8),
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
    color: DesignTokens.colors.background.primary,
    fontSize: fs(DesignTokens.typography.fontSize.lg),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    ...sinPaddingAndroid,
  },
  guardarHeader: {
    color: DesignTokens.colors.background.primary,
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    ...sinPaddingAndroid,
  },
  inactivo: { color: DesignTokens.colors.neutral[500] },
  cuerpo: { padding: sp(16), gap: sp(8) },
  etiqueta: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  input: {
    minHeight: sp(180),
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
  eliminar: {
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
  textoEliminar: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.error[600],
    ...sinPaddingAndroid,
  },
  presionado: { opacity: 0.85 },
  pie: {
    paddingHorizontal: sp(16),
    paddingTop: sp(12),
    backgroundColor: DesignTokens.colors.background.primary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  botonSeguir: {
    minHeight: sp(48),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1.5,
    borderColor: DesignTokens.colors.primary[500],
    backgroundColor: DesignTokens.colors.primary[50],
  },
  botonInactivo: {
    borderColor: DesignTokens.colors.neutral[300],
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  textoSeguir: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[700],
    ...sinPaddingAndroid,
  },
  textoSeguirInactivo: { color: DesignTokens.colors.neutral[500] },
});

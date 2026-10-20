import React, { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";
import { fs, sp } from "src/styles/escala";

import {
  DocumentoMiniatura,
  type BloqueEditable,
  type DatosMiniatura,
} from "../components/DocumentoMiniatura";
import { ReordenarFotos } from "../components/ReordenarFotos";
import { etiquetaDeArea } from "../constantes";
import { useBorradorReporte } from "../state/BorradorReporteContext";
import { FORMATO_CODIGO } from "../constantesDocumento";

/**
 * Paso 4 · Revisión (ADR-006, Decisión 6).
 *
 * El documento **como se imprimirá**, con el ✎ por bloque. Cada ✎ salta a su
 * editor y regresa DIRECTO aquí, sin recorrer los pasos intermedios: quien
 * viene a verificar quiere arreglar y volver a verificar, no reiniciar el
 * recorrido.
 */

interface Props {
  onEditarBloque: (bloque: BloqueEditable) => void;
}

export function RevisionStep({ onEditarBloque }: Props) {
  const { borrador, reordenarFotos } = useBorradorReporte();
  const [ordenando, setOrdenando] = useState(false);

  const datos = useMemo<DatosMiniatura>(
    () => ({
      codigo: FORMATO_CODIGO,
      fecha: borrador.fechaReporte,
      contratistas: borrador.contratistas.map((p) => p.nombre),
      // La supervisión la escribe el servidor desde el roster de la obra; aquí
      // se muestra —tomada del mismo roster en P-00— para que la revisión
      // enseñe el documento COMPLETO, que es todo el punto de esta pantalla.
      supervision: borrador.supervisores.map((p) => p.nombre),
      area: borrador.area ? etiquetaDeArea(borrador.area) : null,
      actividades: borrador.actividades.map((a) => a.texto),
      conclusion: borrador.conclusion,
      fotos: borrador.fotos.map((f) => ({
        id: f.id,
        uri: f.localUri,
        pie: f.pie,
      })),
    }),
    [borrador],
  );

  const alternarOrden = useCallback(() => setOrdenando((v) => !v), []);

  return (
    <ScrollView contentContainerStyle={estilos.cuerpo}>
      {borrador.fotos.length > 1 ? (
        <View style={estilos.barra}>
          <Pressable
            onPress={alternarOrden}
            accessibilityRole="button"
            accessibilityLabel={
              ordenando ? "Terminar de ordenar" : "Ordenar las fotografías"
            }
            style={({ pressed }) => [
              estilos.botonOrdenar,
              ordenando && estilos.botonOrdenarActivo,
              pressed && estilos.presionado,
            ]}
          >
            <Ionicons
              name={ordenando ? "checkmark" : "swap-vertical"}
              size={fs(18)}
              color={
                ordenando
                  ? DesignTokens.colors.background.primary
                  : DesignTokens.colors.executive.primary
              }
            />
            <Text
              style={[
                estilos.textoOrdenar,
                ordenando && estilos.textoOrdenarActivo,
              ]}
            >
              {ordenando ? "Listo" : "Ordenar"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {ordenando ? (
        <View style={estilos.zonaOrden}>
          <Text style={estilos.instruccionOrden}>
            Mantén presionada una fotografía y arrástrala para cambiar su orden.
            El pie viaja con su foto.
          </Text>
          <ReordenarFotos
            fotos={borrador.fotos}
            onReordenar={reordenarFotos}
          />
        </View>
      ) : (
        <DocumentoMiniatura
          datos={datos}
          modo="edit"
          onEditar={onEditarBloque}
        />
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { padding: sp(16), gap: sp(12), paddingBottom: sp(24) },
  barra: { flexDirection: "row", justifyContent: "flex-end" },
  botonOrdenar: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(6),
    paddingHorizontal: sp(12),
    paddingVertical: sp(8),
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1.5,
    borderColor: DesignTokens.colors.executive.primary,
  },
  botonOrdenarActivo: {
    backgroundColor: DesignTokens.colors.executive.primary,
  },
  textoOrdenar: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.executive.primary,
    ...(Platform.OS === "android"
      ? { includeFontPadding: false, textAlignVertical: "center" as const }
      : {}),
  },
  textoOrdenarActivo: { color: DesignTokens.colors.background.primary },
  presionado: { opacity: 0.85 },
  zonaOrden: { gap: sp(12) },
  instruccionOrden: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    color: DesignTokens.colors.neutral[600],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});

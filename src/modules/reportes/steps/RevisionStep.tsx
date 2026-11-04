import React, { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import BloqueDeFirma from "src/modules/firma/BloqueDeFirma";
import { useAppSelector } from "src/redux/hooks";
import { selectUserName } from "src/redux/selectors/authSelectors";
import { DesignTokens } from "src/styles/designTokens";
import { fs, sp } from "src/styles/escala";

import {
  DocumentoMiniatura,
  type BloqueEditable,
  type DatosMiniatura,
} from "../components/DocumentoMiniatura";
import { ReordenarFotos } from "../components/ReordenarFotos";
import { etiquetaDeArea, rotuloDeUbicacion } from "../constantes";
import { useMaquinariaDelDia } from "../hooks/useMaquinariaDelDia";
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
  /**
   * Lo que falta para poder enviar, en palabras. Vacío = se puede enviar.
   *
   * Llega desde el wizard y no se calcula aquí porque la misma lista decide
   * si el botón de enviar está encendido: calcularla dos veces sería permitir
   * que la pantalla y el botón se contradigan.
   */
  falta: string[];
}

export function RevisionStep({ onEditarBloque, falta }: Props) {
  const { borrador, reordenarFotos, setFirma } = useBorradorReporte();
  const [ordenando, setOrdenando] = useState(false);
  const nombre = useAppSelector(selectUserName);
  // No vive en el borrador porque no se captura aquí: el servidor la copia de
  // la tab de Maquinaria al emitir. Se lee al revisar, de las mismas fuentes
  // que esa tab, para que la revisión enseñe el documento COMPLETO.
  const maquinaria = useMaquinariaDelDia(borrador.fechaReporte);

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
      actividades: borrador.actividades.map((a) => ({
        texto: a.texto,
        rotulo: rotuloDeUbicacion(a.zona, a.frente),
      })),
      conclusion: borrador.conclusion,
      maquinaria,
      fotos: borrador.fotos.map((f) => ({
        id: f.id,
        uri: f.localUri,
        pie: f.pie,
      })),
    }),
    [borrador, maquinaria],
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
        <>
          <DocumentoMiniatura
            datos={datos}
            modo="edit"
            onEditar={onEditarBloque}
          />
          {/* La firma va al final, donde va en el documento, y solo cuando se
              está revisando: durante el reordenamiento de fotos la pantalla es
              otra cosa y el bloque estorbaría. */}
          <View style={estilos.firma}>
            <BloqueDeFirma
              firma={borrador.firma}
              onCambiar={setFirma}
              nombre={nombre ?? undefined}
              textoConfirmar="Firmar el reporte"
            />
          </View>

          {/* Va al final del documento y justo encima del botón que exige
              estas cosas. Un botón de enviar apagado sin explicación es un
              callejón sin salida: el usuario no sabe si está roto, si le falta
              un permiso o si solo le falta algo por capturar. Mismo criterio
              que F38 en el detalle. */}
          {falta.length > 0 ? (
            <View style={estilos.falta}>
              <Text style={estilos.faltaTitulo}>Para enviarlo falta:</Text>
              {falta.map((renglon) => (
                <Text key={renglon} style={estilos.faltaRenglon}>
                  · {renglon}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  // Ámbar, el mismo que el módulo reserva para "esto bloquea": no es un error
  // —nada está mal— pero sí impide terminar.
  falta: {
    marginTop: sp(16),
    padding: sp(12),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.warning[50],
    borderWidth: 1,
    borderColor: DesignTokens.colors.warning[100],
    gap: sp(4),
  },
  faltaTitulo: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.warning[800],
    ...sinPaddingAndroid,
  },
  faltaRenglon: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    color: DesignTokens.colors.warning[800],
    ...sinPaddingAndroid,
  },
  cuerpo: { padding: sp(16), gap: sp(12), paddingBottom: sp(24) },
  firma: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
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

import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

import { BotonWizard } from "./BotonWizard";

/**
 * Confirmación de guardado y su resultado (ADR-006, Decisión 7).
 *
 * **El modal está justificado por la finalidad, no por cortesía.** Es la única
 * confirmación del módulo y existe porque después de guardar no hay vuelta
 * atrás dentro de la app. Queda escrito para que nadie lo conserve por inercia:
 * **si algún día se implementa edición post-guardado, este modal se retira.**
 */

interface PropsConfirmacion {
  visible: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
  guardando: boolean;
}

export function ModalConfirmarGuardado({
  visible,
  onCancelar,
  onConfirmar,
  guardando,
}: PropsConfirmacion) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={estilos.telon}>
        <View style={estilos.tarjeta}>
          <Text style={estilos.titulo}>¿Guardar el reporte?</Text>
          <Text style={estilos.texto}>
            El reporte <Text style={estilos.negrita}>no se podrá editar</Text>{" "}
            desde la app después de guardarse.
          </Text>
          <Text style={estilos.texto}>
            El Excel se genera después de guardar.
          </Text>

          <View style={estilos.acciones}>
            <BotonWizard
              etiqueta="Cancelar"
              variante="contorno"
              onPress={onCancelar}
              deshabilitado={guardando}
            />
            <BotonWizard
              etiqueta="Guardar reporte"
              variante="guardar"
              onPress={onConfirmar}
              cargando={guardando}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface PropsResultado {
  visible: boolean;
  /** Con red el reporte va camino al servidor; sin red se queda en el teléfono. */
  enviado: boolean;
  onGenerarExcel: () => void;
  onIrAMisReportes: () => void;
}

export function ModalResultadoGuardado({
  visible,
  enviado,
  onGenerarExcel,
  onIrAMisReportes,
}: PropsResultado) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={estilos.telon}>
        <View style={estilos.tarjeta}>
          <View
            style={[
              estilos.emblema,
              enviado ? estilos.emblemaExito : estilos.emblemaEspera,
            ]}
          >
            <Ionicons
              name={enviado ? "checkmark" : "cloud-offline-outline"}
              size={fs(26)}
              color={DesignTokens.colors.background.primary}
            />
          </View>

          <Text style={estilos.titulo}>
            {enviado ? "Guardado y enviado" : "Guardado en el teléfono"}
          </Text>

          {enviado ? (
            <Text style={estilos.texto}>
              Ya está en el historial de la obra. Cualquier miembro puede
              consultarlo y generar su archivo.
            </Text>
          ) : (
            <>
              <View style={estilos.chip}>
                <Text style={estilos.chipTexto}>Por enviar</Text>
              </View>
              <Text style={estilos.texto}>
                Se enviará solo al recuperar la señal. Los archivos se generan
                cuando el reporte llegue al servidor.
              </Text>
            </>
          )}

          <View style={estilos.accionesColumna}>
            {enviado ? (
              <BotonWizard
                etiqueta="Generar Excel"
                onPress={onGenerarExcel}
                ancho
              />
            ) : null}
            <BotonWizard
              etiqueta="Ir a mis reportes"
              variante={enviado ? "contorno" : "navy"}
              onPress={onIrAMisReportes}
              ancho
            />
          </View>
        </View>
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
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: sp(24),
  },
  tarjeta: {
    width: "100%",
    maxWidth: sp(420),
    borderRadius: DesignTokens.borderRadius.lg,
    backgroundColor: DesignTokens.colors.background.primary,
    padding: sp(20),
    gap: sp(10),
    ...DesignTokens.shadows.lg,
  },
  emblema: {
    alignSelf: "center",
    width: sp(52),
    height: sp(52),
    borderRadius: sp(26),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: sp(4),
  },
  emblemaExito: { backgroundColor: DesignTokens.colors.success[600] },
  emblemaEspera: { backgroundColor: DesignTokens.colors.executive.light },
  titulo: {
    textAlign: "center",
    fontSize: fs(DesignTokens.typography.fontSize.lg),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    ...sinPaddingAndroid,
  },
  texto: {
    textAlign: "center",
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.neutral[600],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  negrita: {
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
  },
  chip: {
    alignSelf: "center",
    paddingHorizontal: sp(10),
    paddingVertical: sp(3),
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.warning[100],
  },
  chipTexto: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.warning[800],
    ...sinPaddingAndroid,
  },
  acciones: { flexDirection: "row", gap: sp(12), marginTop: sp(8) },
  accionesColumna: { gap: sp(10), marginTop: sp(8) },
});

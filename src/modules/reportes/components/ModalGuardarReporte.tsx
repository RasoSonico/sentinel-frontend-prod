import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

import { BotonWizard } from "./BotonWizard";

/**
 * Confirmación de guardado (ADR-006, Decisión 7).
 *
 * **El modal está justificado por la finalidad, no por cortesía.** Es la única
 * confirmación del módulo y existe porque después de enviar no hay vuelta
 * atrás dentro de la app. Queda escrito para que nadie lo conserve por inercia:
 * **si algún día se implementa edición post-envío, este modal se retira.**
 *
 * Dice "enviar" y no "guardar" desde F44: guardado está desde que se captura
 * —el borrador se escribe en cada cambio (F43)— y el único acto irreversible
 * que queda aquí es mandarlo.
 *
 * El modal de RESULTADO que vivía aquí se retiró. Prometía "Guardado y
 * enviado" con un botón "Generar Excel" en el instante en que el reporte
 * apenas entraba a la cola: el error estaba en el diseño, no en el código —en
 * ese momento no hay archivo que generar ni entrega que confirmar—. Al
 * quitarle esa opción ya no quedaba nada que elegir, y un segundo modal solo
 * repetiría, a cambio de un toque por guardado, lo que la lista dice mejor y
 * sola. Ahora "Guardar reporte" lleva directo a REPORTES DE LA OBRA.
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
          <Text style={estilos.titulo}>¿Enviar el reporte?</Text>
          <Text style={estilos.texto}>
            El reporte <Text style={estilos.negrita}>no se podrá editar</Text>{" "}
            desde la app después de enviarse.
          </Text>
          <Text style={estilos.texto}>
            El Excel y el PDF se generan cuando termine de llegar al servidor.
          </Text>

          <View style={estilos.acciones}>
            <BotonWizard
              etiqueta="Cancelar"
              variante="contorno"
              onPress={onCancelar}
              deshabilitado={guardando}
            />
            <BotonWizard
              etiqueta="Enviar reporte"
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
  acciones: { flexDirection: "row", gap: sp(12), marginTop: sp(8) },
});

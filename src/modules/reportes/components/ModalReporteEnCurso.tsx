import React, { useState } from "react";
import { Modal, Platform, StyleSheet, Text, View } from "react-native";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";
import type { ResumenBorrador } from "src/hooks/reportes/useBorradoresDeReporte";
import { fechaConDia } from "src/modules/avance/utils/fechaPrograma";

import { BotonWizard } from "./BotonWizard";

/**
 * "Tienes un reporte en curso" (ADR-006 F43).
 *
 * Sale al tocar CREAR cuando ya hay un borrador de esta obra. Existe porque
 * crear es ambiguo en ese momento y solo el usuario sabe cuál de las dos cosas
 * quiere: seguir con lo de la mañana, o abrir un segundo reporte del día —que
 * se permite, porque el límite de reportes por día no lo pone la app—.
 *
 * **Son dos pasos y el segundo no es ceremonia.** "Nuevo" descarta el que está
 * en curso, y descartar trabajo capturado es irreversible: no hay copia en el
 * servidor, porque un borrador nunca salió del teléfono. El segundo paso dice
 * de qué fecha es y qué lleva dentro, para que la decisión se tome viendo lo
 * que se va a perder y no a ciegas.
 */

interface Props {
  borrador: ResumenBorrador | null;
  onContinuar: () => void;
  /** Descarta el borrador y abre uno nuevo. Ya confirmado. */
  onDescartarYEmpezar: () => void;
  onCancelar: () => void;
}

/** "3 actividades y 2 fotos", o "todavía sin actividades". */
const queLleva = (borrador: ResumenBorrador): string => {
  const partes: string[] = [];
  if (borrador.actividadesCount > 0) {
    partes.push(
      borrador.actividadesCount === 1
        ? "1 actividad"
        : `${borrador.actividadesCount} actividades`,
    );
  }
  if (borrador.fotosCount > 0) {
    partes.push(
      borrador.fotosCount === 1 ? "1 foto" : `${borrador.fotosCount} fotos`,
    );
  }
  if (borrador.tieneConclusion) partes.push("observaciones");

  if (partes.length === 0) return "Todavía no tiene actividades capturadas.";
  if (partes.length === 1) return `Lleva ${partes[0]}.`;
  return `Lleva ${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}.`;
};

export function ModalReporteEnCurso({
  borrador,
  onContinuar,
  onDescartarYEmpezar,
  onCancelar,
}: Props) {
  /**
   * El paso vive aquí y no en la pantalla: es estado de esta conversación, y
   * sacarlo obligaría a quien la abre a saber que tiene dos pasos.
   */
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

  const cerrar = () => {
    setConfirmandoDescarte(false);
    onCancelar();
  };

  if (!borrador) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={cerrar}>
      <View style={estilos.telon}>
        <View style={estilos.tarjeta}>
          {confirmandoDescarte ? (
            <>
              <Text style={estilos.titulo}>
                ¿Descartar el reporte en curso?
              </Text>
              <Text style={estilos.texto}>
                Se borrará el del{" "}
                <Text style={estilos.negrita}>
                  {fechaConDia(borrador.fechaReporte)}
                </Text>
                . {queLleva(borrador)}
              </Text>
              <Text style={estilos.aviso}>
                Si generas uno nuevo, se perderá el avance que tenías del
                reporte abierto.
              </Text>

              <View style={estilos.acciones}>
                <BotonWizard
                  etiqueta="Conservarlo"
                  variante="contorno"
                  onPress={() => setConfirmandoDescarte(false)}
                />
                <BotonWizard
                  etiqueta="Descartar"
                  variante="peligro"
                  onPress={() => {
                    setConfirmandoDescarte(false);
                    onDescartarYEmpezar();
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={estilos.titulo}>Tienes un reporte en curso</Text>
              <Text style={estilos.texto}>
                Del{" "}
                <Text style={estilos.negrita}>
                  {fechaConDia(borrador.fechaReporte)}
                </Text>
                . {queLleva(borrador)}
              </Text>

              <View style={estilos.acciones}>
                <BotonWizard
                  etiqueta="Nuevo"
                  variante="contorno"
                  onPress={() => setConfirmandoDescarte(true)}
                />
                <BotonWizard etiqueta="Continuarlo" onPress={onContinuar} />
              </View>
            </>
          )}
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
  aviso: {
    textAlign: "center",
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.error[700],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  negrita: {
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
  },
  acciones: { flexDirection: "row", gap: sp(12), marginTop: sp(8) },
});

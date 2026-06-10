import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import { useCreateReconciliacion } from "src/hooks/data/query/useMaquinaria";
import DateInput from "src/components/ui/DateInput";
import { ResultadoRecon } from "src/types/maquinaria";
import { DateUtils } from "src/utils/dateUtils";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  item: MaquinariaHubItemRealm | null;
}

const ReconciliacionModal: React.FC<Props> = ({ isVisible, onClose, item }) => {
  const today = DateUtils.localDateToUTC(new Date());
  const [selected, setSelected] = useState<ResultadoRecon | null>(null);
  const [fechaSalida, setFechaSalida] = useState(today);

  const createReconciliacion = useCreateReconciliacion();

  const handleConfirmar = () => {
    if (!item || !selected) return;

    let body: Parameters<typeof createReconciliacion.mutate>[0];
    if (selected === "SALIO") {
      body = {
        estancia_id: item.estancia_id,
        resultado: "SALIO",
        fecha_salida_indicada: fechaSalida,
      };
    } else {
      body = { estancia_id: item.estancia_id, resultado: selected };
    }

    createReconciliacion.mutate(body, {
      onSuccess: () => {
        setSelected(null);
        onClose();
      },
      onError: (error: Error) => {
        Alert.alert(
          "Error",
          error.message ?? "No se pudo resolver. Intenta de nuevo.",
        );
      },
    });
  };

  if (!item) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.alertIconWrap}>
            <Ionicons
              name="alert-circle"
              size={32}
              color={DesignTokens.colors.error[500]}
            />
          </View>

          <Text style={styles.title}>¿Sigue en obra?</Text>
          <Text style={styles.machine}>
            {item.tipo} · {item.marca} {item.modelo}
          </Text>
          <Text style={styles.description}>
            Esta máquina lleva{" "}
            <Text style={styles.daysHighlight}>
              {item.dias_sin_reporte} días
            </Text>{" "}
            sin reporte. Confirma su estado actual.
          </Text>

          <View style={styles.options}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                selected === "SIGUE_EN_OBRA" && styles.optionBtnActive,
              ]}
              onPress={() => setSelected("SIGUE_EN_OBRA")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={
                  selected === "SIGUE_EN_OBRA"
                    ? DesignTokens.colors.success[600]
                    : DesignTokens.colors.neutral[400]
                }
              />
              <Text
                style={[
                  styles.optionText,
                  selected === "SIGUE_EN_OBRA" && {
                    color: DesignTokens.colors.success[700],
                  },
                ]}
              >
                Sigue en obra
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionBtn,
                selected === "SALIO" && styles.optionBtnActiveDanger,
              ]}
              onPress={() => setSelected("SALIO")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="exit"
                size={20}
                color={
                  selected === "SALIO"
                    ? DesignTokens.colors.error[600]
                    : DesignTokens.colors.neutral[400]
                }
              />
              <Text
                style={[
                  styles.optionText,
                  selected === "SALIO" && {
                    color: DesignTokens.colors.error[700],
                  },
                ]}
              >
                Salió de la obra
              </Text>
            </TouchableOpacity>

            {selected === "SALIO" && (
              <View style={styles.fechaSalidaWrap}>
                <Text style={styles.fechaLabel}>Fecha de salida</Text>
                <DateInput value={fechaSalida} onChange={setFechaSalida} />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.optionBtn,
                selected === "EN_REPARACION" && styles.optionBtnActiveWarning,
              ]}
              onPress={() => setSelected("EN_REPARACION")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="construct"
                size={20}
                color={
                  selected === "EN_REPARACION"
                    ? DesignTokens.colors.warning[600]
                    : DesignTokens.colors.neutral[400]
                }
              />
              <Text
                style={[
                  styles.optionText,
                  selected === "EN_REPARACION" && {
                    color: DesignTokens.colors.warning[700],
                  },
                ]}
              >
                En reparación
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                !selected && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirmar}
              disabled={!selected || createReconciliacion.isPending}
              activeOpacity={0.8}
            >
              {createReconciliacion.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postponeBtn}
              onPress={() => {
                createReconciliacion.mutate(
                  { estancia_id: item.estancia_id, resultado: "POSPUESTO" },
                  { onSuccess: onClose },
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.postponeText}>Decidir después</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.lg,
    padding: 24,
    width: "100%",
    ...DesignTokens.shadows.lg,
  },
  alertIconWrap: {
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
    textAlign: "center",
    marginBottom: 4,
  },
  machine: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[600],
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  daysHighlight: {
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.error[600],
  },
  options: {
    gap: 8,
    marginBottom: 20,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  optionBtnActive: {
    borderColor: DesignTokens.colors.success[400],
    backgroundColor: DesignTokens.colors.success[50],
  },
  optionBtnActiveDanger: {
    borderColor: DesignTokens.colors.error[400],
    backgroundColor: DesignTokens.colors.error[50],
  },
  optionBtnActiveWarning: {
    borderColor: DesignTokens.colors.warning[400],
    backgroundColor: DesignTokens.colors.warning[50],
  },
  optionText: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[700],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  fechaSalidaWrap: {
    paddingLeft: 32,
  },
  fechaLabel: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
    marginBottom: 6,
  },
  actions: {
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 14,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: DesignTokens.colors.neutral[300],
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  postponeBtn: {
    padding: 12,
    alignItems: "center",
  },
  postponeText: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[500],
  },
});

export default ReconciliacionModal;

import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import BottomSheetBackdrop from "src/components/ui/BottomSheetBackdrop";
import { DesignTokens } from "src/styles/designTokens";
import { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import { useCloseEstancia } from "src/hooks/data/query/useMaquinaria";
import DateInput from "src/components/ui/DateInput";
import { TipoSalida, MotivoSalida } from "src/types/maquinaria";
import { DateUtils } from "src/utils/dateUtils";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  item: MaquinariaHubItemRealm | null;
}

const MOTIVOS_SALIDA: { value: MotivoSalida; label: string }[] = [
  { value: "TERMINO_ALCANCE", label: "Terminó su alcance" },
  { value: "FIN_RENTA", label: "Fin de renta" },
  { value: "FALLA_MECANICA", label: "Falla mecánica" },
  { value: "REUBICADA", label: "Reubicada a otra obra" },
  { value: "YA_NO_REQUERIDA", label: "Ya no requerida" },
  { value: "OTRO", label: "Otro motivo" },
];

const SalidaObraSheet: React.FC<Props> = ({ isVisible, onClose, item }) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["65%", "90%"], []);

  const today = DateUtils.localDateToUTC(new Date());
  const [tipoSalida, setTipoSalida] = useState<TipoSalida>("DEFINITIVA");
  const [fechaSalida, setFechaSalida] = useState(today);
  const [motivoSalida, setMotivoSalida] = useState<MotivoSalida | null>(null);
  const [detalle, setDetalle] = useState("");
  const [lastItemId, setLastItemId] = useState<number | null>(null);

  // Normalize to null so undefined (item=null) and null (initial) are equal
  const currentItemId = item?.estancia_id ?? null;
  if (currentItemId !== lastItemId) {
    setLastItemId(currentItemId);
    setTipoSalida("DEFINITIVA");
    setFechaSalida(today);
    setMotivoSalida(null);
    setDetalle("");
  }

  const closeEstancia = useCloseEstancia();

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} onPress={onClose} />
    ),
    [onClose],
  );

  const isValid =
    !!motivoSalida &&
    !!fechaSalida &&
    (motivoSalida !== "OTRO" || detalle.trim().length > 0);

  const handleConfirmar = () => {
    if (!item || !motivoSalida) return;

    closeEstancia.mutate(
      {
        estanciaId: item.estancia_id,
        body: {
          fecha_salida: fechaSalida,
          tipo_salida: tipoSalida,
          motivo_salida: motivoSalida,
          detalle_motivo_salida: detalle.trim(),
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error: Error) => {
          Alert.alert(
            "Error",
            error.message ??
              "No se pudo registrar la salida. Intenta de nuevo.",
          );
        },
      },
    );
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Salida de obra</Text>
        {item && (
          <Text style={styles.machine}>
            {item.tipo} · {item.marca} {item.modelo}
          </Text>
        )}

        <Text style={styles.sectionLabel}>Tipo de salida</Text>
        <View style={styles.toggleRow}>
          {(["DEFINITIVA", "TEMPORAL"] as TipoSalida[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.toggleBtn,
                tipoSalida === t && styles.toggleBtnActive,
              ]}
              onPress={() => setTipoSalida(t)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  tipoSalida === t && styles.toggleTextActive,
                ]}
              >
                {t === "DEFINITIVA" ? "Definitiva" : "Temporal"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Fecha de salida</Text>
        <DateInput value={fechaSalida} onChange={setFechaSalida} />

        <Text style={styles.sectionLabel}>Motivo de salida</Text>
        <View style={styles.motivosList}>
          {MOTIVOS_SALIDA.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[
                styles.motivoRow,
                motivoSalida === m.value && styles.motivoRowActive,
              ]}
              onPress={() => setMotivoSalida(m.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radio,
                  motivoSalida === m.value && styles.radioActive,
                ]}
              />
              <Text
                style={[
                  styles.motivoLabel,
                  motivoSalida === m.value && styles.motivoLabelActive,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {motivoSalida === "OTRO" && (
          <>
            <Text style={styles.sectionLabel}>
              Especificar motivo (requerido)
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Describe el motivo..."
              placeholderTextColor={DesignTokens.colors.neutral[400]}
              value={detalle}
              onChangeText={setDetalle}
              multiline
              numberOfLines={3}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
          onPress={handleConfirmar}
          disabled={!isValid || closeEstancia.isPending}
          activeOpacity={0.8}
        >
          {closeEstancia.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirmar salida</Text>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  handle: { backgroundColor: DesignTokens.colors.neutral[300] },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
    marginBottom: 4,
  },
  machine: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[500],
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
  },
  toggleBtnActive: {
    borderColor: DesignTokens.colors.error[400],
    backgroundColor: DesignTokens.colors.error[50],
  },
  toggleText: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  toggleTextActive: {
    color: DesignTokens.colors.error[700],
  },
  motivosList: {
    gap: 6,
    marginBottom: 20,
  },
  motivoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  motivoRowActive: {
    borderColor: DesignTokens.colors.error[300],
    backgroundColor: DesignTokens.colors.error[50],
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: DesignTokens.colors.neutral[300],
  },
  radioActive: {
    borderColor: DesignTokens.colors.error[500],
    backgroundColor: DesignTokens.colors.error[500],
  },
  motivoLabel: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[700],
  },
  motivoLabelActive: {
    color: DesignTokens.colors.error[700],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.md,
    padding: 12,
    fontSize: 14,
    color: DesignTokens.colors.neutral[800],
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  confirmBtn: {
    backgroundColor: DesignTokens.colors.error[500],
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
});

export default SalidaObraSheet;

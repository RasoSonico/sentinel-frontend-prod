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
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import { useCreateJornada } from "src/hooks/data/query/useMaquinaria";
import { MotivoInactividad } from "src/types/maquinaria";
import { DateUtils } from "src/utils/dateUtils";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  item: MaquinariaHubItemRealm | null;
}

const MOTIVOS: { value: MotivoInactividad; label: string; icon: string }[] = [
  { value: "FALLA_MECANICA", label: "Falla mecánica", icon: "construct" },
  { value: "SIN_OPERADOR", label: "Sin operador", icon: "person-remove" },
  { value: "SIN_FRENTE", label: "Sin frente de trabajo", icon: "stop-circle" },
  { value: "CLIMA", label: "Clima adverso", icon: "rainy" },
  { value: "OTRO", label: "Otro motivo", icon: "ellipsis-horizontal-circle" },
];

const SinOperarSheet: React.FC<Props> = ({ isVisible, onClose, item }) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["55%", "75%"], []);

  const [motivo, setMotivo] = useState<MotivoInactividad | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [lastItemId, setLastItemId] = useState<number | null>(null);

  // Normalize to null so undefined (item=null) and null (initial) are equal
  const currentItemId = item?.estancia_id ?? null;
  if (currentItemId !== lastItemId) {
    setLastItemId(currentItemId);
    setMotivo(null);
    setObservaciones("");
  }

  const createJornada = useCreateJornada();

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

  const handleConfirmar = () => {
    if (!item || !motivo) return;

    const today = DateUtils.localDateToUTC(new Date());

    createJornada.mutate(
      {
        estancia: item.estancia_id,
        fecha: today,
        estado: "SIN_OPERAR",
        motivo_inactividad: motivo,
        observaciones: observaciones.trim() || undefined,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error: Error) => {
          Alert.alert(
            "Error",
            error.message ?? "No se pudo registrar. Intenta de nuevo.",
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
        <Text style={styles.title}>Sin operar hoy</Text>
        {item && (
          <Text style={styles.machine}>
            {item.tipo} · {item.marca} {item.modelo}
          </Text>
        )}
        <Text style={styles.sectionLabel}>Motivo de inactividad</Text>
        <View style={styles.motivosGrid}>
          {MOTIVOS.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[
                styles.motivoBtn,
                motivo === m.value && styles.motivoBtnActive,
              ]}
              onPress={() => setMotivo(m.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={m.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={20}
                color={
                  motivo === m.value
                    ? DesignTokens.colors.warning[700]
                    : DesignTokens.colors.neutral[500]
                }
              />
              <Text
                style={[
                  styles.motivoLabel,
                  motivo === m.value && styles.motivoLabelActive,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Notas (opcional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Observaciones adicionales..."
          placeholderTextColor={DesignTokens.colors.neutral[400]}
          value={observaciones}
          onChangeText={setObservaciones}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.confirmBtn, !motivo && styles.confirmBtnDisabled]}
          onPress={handleConfirmar}
          disabled={!motivo || createJornada.isPending}
          activeOpacity={0.8}
        >
          {createJornada.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirmar</Text>
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
  motivosGrid: {
    gap: 8,
    marginBottom: 20,
  },
  motivoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: DesignTokens.colors.background.secondary,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  motivoBtnActive: {
    borderColor: DesignTokens.colors.warning[400],
    backgroundColor: DesignTokens.colors.warning[50],
  },
  motivoLabel: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[700],
  },
  motivoLabelActive: {
    color: DesignTokens.colors.warning[700],
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
    backgroundColor: DesignTokens.colors.warning[500],
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

export default SinOperarSheet;

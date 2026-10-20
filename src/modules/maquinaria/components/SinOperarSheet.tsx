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
} from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import BottomSheetBackdrop from "src/components/ui/BottomSheetBackdrop";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import type { FilaMaquinaria } from "../filaMaquinaria";
import { usePendingJornadaQueue } from "src/hooks/maquinaria/usePendingJornadaQueue";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { useSnackbar } from "src/hooks/useSnackbar";
import { MotivoInactividad } from "src/types/maquinaria";
import { DateUtils } from "src/utils/dateUtils";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  item: FilaMaquinaria | null;
  constructionId: number | undefined;
}

const MOTIVOS: { value: MotivoInactividad; label: string; icon: string }[] = [
  { value: "FALLA_MECANICA", label: "Falla mecánica", icon: "construct" },
  { value: "SIN_OPERADOR", label: "Sin operador", icon: "person-remove" },
  { value: "SIN_FRENTE", label: "Sin frente de trabajo", icon: "stop-circle" },
  { value: "CLIMA", label: "Clima adverso", icon: "rainy" },
  { value: "OTRO", label: "Otro motivo", icon: "ellipsis-horizontal-circle" },
];

const SinOperarSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  item,
  constructionId,
}) => {
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

  const { addToQueue } = usePendingJornadaQueue();
  const isOnline = useNetworkStatus();
  const { showSnackbar } = useSnackbar();

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
    if (!item || !motivo || constructionId === undefined) return;

    const today = DateUtils.localDateToUTC(new Date());

    // A la cola, igual que la jornada trabajando: una máquina parada por falla
    // se reporta desde el frente, que es donde no hay señal.
    addToQueue({
      estanciaId: item.estancia_id,
      maquinariaId: item.id,
      maquinariaLocalId: item.maquinariaLocalId,
      esTransitoria: false,
      fecha: today,
      estado: "SIN_OPERAR",
      motivoInactividad: motivo,
      observaciones: observaciones.trim(),
      constructionId,
      maquinariaEtiqueta: `${item.tipo} · ${item.marca} ${item.modelo}`,
    });

    showSnackbar(
      isOnline === true
        ? "Jornada registrada"
        : "Guardada en el teléfono · se enviará al haber señal",
      "success",
    );
    onClose();
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
      // Este sheet tampoco los tenía, y tiene su propio campo de texto al
      // final del scroll. Mismo trío que los sheets de avance.
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
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
        <BottomSheetTextInput
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
          disabled={!motivo}
          activeOpacity={0.8}
        >
          {/* Sin indicador de carga: guardar es ahora una escritura local y
              no hay espera de red que mostrar. */}
          <Text style={styles.confirmBtnText}>Confirmar</Text>
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

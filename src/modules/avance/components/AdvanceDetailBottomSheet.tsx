import React, {
  useCallback,
  useRef,
  useMemo,
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import BottomSheetBackdrop from "../../../components/ui/BottomSheetBackdrop";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhysicalAdvanceResponse } from "../../../types/entities";
import { useUpdateAdvance } from "../../../hooks/data/query/useAvance";
import { useFormattedDate } from "../../../hooks/ui/useDateFormatting";
import {
  advanceEditSchema,
  advanceEditDefaultValues,
  type AdvanceEditFormData,
} from "../forms/util/advanceEditValidation";
import styles from "./styles/AdvanceDetailBottomSheet.styles";
import { DesignTokens } from "../../../styles/designTokens";

interface AdvanceDetailBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  advance: PhysicalAdvanceResponse | null;
  onAdvanceUpdated?: (updatedAdvance: PhysicalAdvanceResponse) => void;
}

const AdvanceDetailBottomSheet: React.FC<AdvanceDetailBottomSheetProps> = ({
  isVisible,
  onClose,
  advance,
  onAdvanceUpdated,
}) => {
  // States
  const [isEditingVolume, setIsEditingVolume] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [volumeItemY, setVolumeItemY] = useState(0);
  const [commentItemY, setCommentItemY] = useState(0);

  // Mutations
  const updateAdvanceMutation = useUpdateAdvance();

  // Fecha vía DateUtils (ADR-003 D9): new Date("YYYY-MM-DD") interpretaba
  // medianoche UTC y mostraba el día anterior en CDMX
  const formattedDate = useFormattedDate(advance?.date, "medium");

  // Refs
  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // BottomSheet snap points — two points so the sheet can extend above the keyboard
  const snapPoints = useMemo(() => ["75%", "95%"], []);

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AdvanceEditFormData>({
    resolver: zodResolver(advanceEditSchema),
    defaultValues: advanceEditDefaultValues,
    mode: "onChange",
  });

  // Reset form when advance changes
  useEffect(() => {
    if (advance) {
      reset({
        volume: advance.volume || "",
        comments: advance.comments || "",
      });
    }
  }, [advance, reset]);

  // Handle bottom sheet visibility
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
      setIsEditingVolume(false);
      setIsEditingComment(false);
    }
  }, [isVisible]);

  // Scroll to the active edit field so it's visible without manual scrolling
  useEffect(() => {
    if (!isEditingVolume) return;
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: volumeItemY, animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [isEditingVolume, volumeItemY]);

  useEffect(() => {
    if (!isEditingComment) return;
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: commentItemY, animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [isEditingComment, commentItemY]);

  // Handle bottom sheet changes
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  // Handle form submission
  const onSubmit = async (data: AdvanceEditFormData) => {
    if (!advance) return;

    try {
      const updatedAdvance = await updateAdvanceMutation.mutateAsync({
        advanceId: advance.id,
        updates: {
          volume: data.volume,
          comments: data.comments || undefined,
        },
      });

      setIsEditingVolume(false);
      setIsEditingComment(false);
      onAdvanceUpdated?.(updatedAdvance);

      Alert.alert("Éxito", "El avance ha sido actualizado correctamente", [
        { text: "Entendido", style: "default" },
      ]);
    } catch (error) {
      Alert.alert(
        "Error",
        "No se pudo actualizar el avance. Inténtalo de nuevo.",
        [{ text: "Entendido", style: "default" }],
      );
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    if (advance) {
      reset({
        volume: advance.volume || "",
        comments: advance.comments || "",
      });
    }
    setIsEditingVolume(false);
    setIsEditingComment(false);
  };

  // Custom volume input handler
  const handleVolumeChange = (
    value: string,
    onChange: (value: string) => void,
  ) => {
    const numericValue = value.replace(/[^0-9.]/g, "");
    const parts = numericValue.split(".");
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) {
      const limitedValue = parts[0] + "." + parts[1].substring(0, 2);
      onChange(limitedValue);
      return;
    }
    onChange(numericValue);
  };

  // Check if we are in editing mode
  const isEditing = isEditingVolume || isEditingComment;

  if (!advance) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isVisible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      style={styles.bottomSheetContainer}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} onPress={onClose} />
      )}
    >
      <View style={styles.fixedHeader}>
        {/* Header Title */}
        <View style={styles.subheaderSection}>
          <View style={styles.headerTitleSection}>
            <Text style={styles.headerTitle}>Detalle de Avances</Text>
          </View>
        </View>

        {/* Date and Status Row */}
        <View style={styles.dateStatusRow}>
          <View style={styles.dateContainer}>
            <Text style={styles.valueText}>
              {advance.date ? formattedDate : "Sin fecha"}
            </Text>
          </View>

          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                advance.status === "APPROVED"
                  ? styles.approvedBadge
                  : advance.status === "REJECTED"
                    ? styles.rejectedBadge
                    : styles.pendingBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  advance.status === "APPROVED"
                    ? styles.approvedText
                    : advance.status === "REJECTED"
                      ? styles.rejectedText
                      : styles.pendingText,
                ]}
              >
                {advance.status === "APPROVED"
                  ? "Aprobado"
                  : advance.status === "REJECTED"
                    ? "Rechazado"
                    : "Pendiente"}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <BottomSheetScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Bloque de contexto único (ADR-003 D7, L-01c): cejilla
            catálogo · partida › sección · wbs + descripción del concepto —
            mismo lenguaje de cabecera en toda la app */}
        <View style={styles.itemContainer}>
          <Text style={styles.contextEyebrow} numberOfLines={2}>
            {[
              advance.catalog_name,
              advance.concept_section_name
                ? `${advance.work_item_name ?? ""} › ${advance.concept_section_name}`
                : advance.work_item_name,
              advance.concept_wbs_code,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text style={styles.contextDescription}>
            {advance.concept_description || `Concepto #${advance.concept}`}
          </Text>
        </View>

        {/* Volumen con Unidad */}
        <View
          style={styles.itemContainer}
          onLayout={(e) => setVolumeItemY(e.nativeEvent.layout.y)}
        >
          <View style={styles.itemLabel}>
            <Text style={styles.labelText}>Volumen</Text>
            <TouchableOpacity
              onPress={() => setIsEditingVolume(!isEditingVolume)}
              style={styles.editIconContainer}
            >
              <Ionicons
                name="pencil"
                size={14}
                color={DesignTokens.colors.primary[600]}
              />
            </TouchableOpacity>
          </View>

          {isEditingVolume ? (
            <Controller
              control={control}
              name="volume"
              render={({ field: { onChange, value } }) => (
                <View>
                  <View style={styles.volumeInputRow}>
                    <BottomSheetTextInput
                      style={[
                        styles.volumeInput,
                        errors.volume && styles.inputError,
                      ]}
                      placeholder="Volumen"
                      value={value}
                      onChangeText={(text) =>
                        handleVolumeChange(text, onChange)
                      }
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <Text style={styles.unitText}>
                      {advance.concept_unit || ""}
                    </Text>
                  </View>
                  {errors.volume && (
                    <View style={styles.errorRow}>
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={DesignTokens.colors.error[500]}
                      />
                      <Text style={styles.errorText}>
                        {errors.volume.message}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />
          ) : (
            <Text style={styles.volumeValue}>
              {parseFloat(advance.volume).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {advance.concept_unit || ""}
            </Text>
          )}

          {advance.total_amount && (
            <Text style={styles.amountValue}>
              Importe: $
              {parseFloat(advance.total_amount).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          )}
        </View>

        {/* Evidencia fotográfica (ADR-003 D7): franja horizontal de
            miniaturas, solo lectura — agregar fotos desde el detalle queda
            en deuda técnica. Oculta si el avance no tiene fotos. */}
        {advance.photos && advance.photos.length > 0 ? (
          <View style={styles.itemContainer}>
            <View style={styles.itemLabel}>
              <Text style={styles.labelText}>
                Evidencia · {advance.photos.length}{" "}
                {advance.photos.length === 1 ? "foto" : "fotos"}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.evidenceRow}
            >
              {Array.from(advance.photos).map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.thumbnail_url || photo.url }}
                  style={styles.evidenceThumb}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Comentario */}
        <View
          style={styles.itemContainer}
          onLayout={(e) => setCommentItemY(e.nativeEvent.layout.y)}
        >
          <View style={styles.itemLabel}>
            <Text style={styles.labelText}>Comentario</Text>

            {advance.comments ? (
              <TouchableOpacity
                onPress={() => setIsEditingComment(!isEditingComment)}
                style={styles.editIconContainer}
              >
                <Ionicons
                  name="pencil"
                  size={14}
                  color={DesignTokens.colors.primary[600]}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditingComment(true)}
                style={styles.editIconContainer}
              >
                <Ionicons
                  name="add"
                  size={14}
                  color={DesignTokens.colors.primary[600]}
                />
              </TouchableOpacity>
            )}
          </View>

          {isEditingComment ? (
            <Controller
              control={control}
              name="comments"
              render={({ field: { onChange, value } }) => (
                <View>
                  <BottomSheetTextInput
                    style={[
                      styles.commentsInput,
                      errors.comments && styles.inputError,
                    ]}
                    placeholder="Agregar comentarios (opcional)"
                    value={value || ""}
                    onChangeText={onChange}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {errors.comments && (
                    <View style={styles.errorRow}>
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={DesignTokens.colors.error[500]}
                      />
                      <Text style={styles.errorText}>
                        {errors.comments.message}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />
          ) : (
            <Text style={styles.commentText}>
              {advance.comments || "Sin comentarios"}
            </Text>
          )}
        </View>
      </BottomSheetScrollView>

      {/* Action Buttons — outside ScrollView so they don't collapse the layout on keyboard open */}
      {isEditing && (
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
              disabled={updateAdvanceMutation.isPending}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isDirty || updateAdvanceMutation.isPending) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={updateAdvanceMutation.isPending || !isDirty}
            >
              {updateAdvanceMutation.isPending ? (
                <ActivityIndicator
                  size="small"
                  color={DesignTokens.colors.background.primary}
                />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </BottomSheet>
  );
};

export default AdvanceDetailBottomSheet;

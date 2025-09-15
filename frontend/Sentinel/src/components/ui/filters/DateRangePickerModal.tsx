import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import {
  getResponsiveSpacing,
  getResponsiveFontSize,
} from "src/utils/responsive";
import { DateFilter } from "./DateRangeFilter";
import { DateUtils } from "src/utils/dateUtils";
import { useDatePresets } from "src/hooks/ui/useDateFormatting";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface DateRangePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (dateFilter: DateFilter | null) => void;
  initialValue?: DateFilter | null;
}

interface DatePreset {
  id: string;
  label: string;
  getValue: () => DateFilter;
}

export const DateRangePickerModal: React.FC<DateRangePickerModalProps> = ({
  visible,
  onClose,
  onApply,
  initialValue,
}) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const datePresets = useDatePresets();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState<"range" | "single">("range");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [singleDate, setSingleDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showSinglePicker, setShowSinglePicker] = useState(false);

  // ✅ Convert datePresets to DatePreset[] format
  const DATE_PRESETS: DatePreset[] = [
    { id: "today", label: datePresets.today.label, getValue: () => datePresets.today },
    { id: "last7days", label: datePresets.last7Days.label, getValue: () => datePresets.last7Days },
    { id: "last30days", label: datePresets.last30Days.label, getValue: () => datePresets.last30Days },
    { id: "thisMonth", label: datePresets.thisMonth.label, getValue: () => datePresets.thisMonth },
    { id: "lastMonth", label: datePresets.lastMonth.label, getValue: () => datePresets.lastMonth },
  ];

  React.useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();

      // ✅ Initialize with current values using UTC parsing
      if (initialValue) {
        if (initialValue.type === "single" && initialValue.date) {
          // Convert UTC date to local date for picker
          const utcDate = DateUtils.parseUTCDate(initialValue.date);
          const localDate = new Date(
            utcDate.getUTCFullYear(),
            utcDate.getUTCMonth(),
            utcDate.getUTCDate()
          );
          setSingleDate(localDate);
          setCustomMode("single");
        } else if (
          initialValue.type === "range" &&
          initialValue.startDate &&
          initialValue.endDate
        ) {
          // Convert UTC dates to local dates for pickers
          const startUTC = DateUtils.parseUTCDate(initialValue.startDate);
          const endUTC = DateUtils.parseUTCDate(initialValue.endDate);
          
          const localStartDate = new Date(
            startUTC.getUTCFullYear(),
            startUTC.getUTCMonth(),
            startUTC.getUTCDate()
          );
          const localEndDate = new Date(
            endUTC.getUTCFullYear(),
            endUTC.getUTCMonth(),
            endUTC.getUTCDate()
          );
          
          setStartDate(localStartDate);
          setEndDate(localEndDate);
          setCustomMode("range");
        }

        // Check if it matches a preset
        const matchingPreset = DATE_PRESETS.find((preset) => {
          const presetValue = preset.getValue();
          return JSON.stringify(presetValue) === JSON.stringify(initialValue);
        });
        setSelectedPreset(matchingPreset?.id || null);
      }
    } else {
      bottomSheetModalRef.current?.close();
    }
  }, [visible, initialValue]);

  const handlePresetSelect = (preset: DatePreset) => {
    setSelectedPreset(preset.id);
    const value = preset.getValue();

    if (value.type === "single" && value.date) {
      // ✅ Convert UTC date to local date for picker
      const utcDate = DateUtils.parseUTCDate(value.date);
      const localDate = new Date(
        utcDate.getUTCFullYear(),
        utcDate.getUTCMonth(),
        utcDate.getUTCDate()
      );
      setSingleDate(localDate);
      setCustomMode("single");
    } else if (value.type === "range" && value.startDate && value.endDate) {
      // ✅ Convert UTC dates to local dates for pickers
      const startUTC = DateUtils.parseUTCDate(value.startDate);
      const endUTC = DateUtils.parseUTCDate(value.endDate);
      
      const localStartDate = new Date(
        startUTC.getUTCFullYear(),
        startUTC.getUTCMonth(),
        startUTC.getUTCDate()
      );
      const localEndDate = new Date(
        endUTC.getUTCFullYear(),
        endUTC.getUTCMonth(),
        endUTC.getUTCDate()
      );
      
      setStartDate(localStartDate);
      setEndDate(localEndDate);
      setCustomMode("range");
    }
  };

  const handleApply = () => {
    if (selectedPreset) {
      const preset = DATE_PRESETS.find((p) => p.id === selectedPreset);
      if (preset) {
        onApply(preset.getValue());
        return;
      }
    }

    // ✅ Custom date selection - convert local dates to UTC range for proper timezone handling
    if (customMode === "single") {
      const utcRange = DateUtils.localDateToUTCRange(singleDate);
      onApply({
        type: "range", // Always use range for proper timezone handling
        startDate: utcRange.start,
        endDate: utcRange.end,
        label: format(singleDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
      });
    } else {
      // Ensure start date is before end date
      const actualStartDate = startDate <= endDate ? startDate : endDate;
      const actualEndDate = startDate <= endDate ? endDate : startDate;

      // Get UTC ranges for each date to ensure full day coverage
      const startRange = DateUtils.localDateToUTCRange(actualStartDate);
      const endRange = DateUtils.localDateToUTCRange(actualEndDate);

      onApply({
        type: "range",
        startDate: startRange.start,
        endDate: endRange.end,
      });
    }
  };

  const handleClear = () => {
    onApply(null);
  };

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={[SCREEN_HEIGHT * 0.7]}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filtrar por fecha</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={24}
              color={DesignTokens.colors.neutral[800]}
            />
          </TouchableOpacity>
        </View>

        {/* Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecciones rápidas</Text>
          <View style={styles.presetGrid}>
            {DATE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetChip,
                  selectedPreset === preset.id && styles.presetChipActive,
                ]}
                onPress={() => handlePresetSelect(preset)}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedPreset === preset.id && styles.presetTextActive,
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selección personalizada</Text>

          {/* Mode Selection */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                customMode === "single" && styles.modeButtonActive,
              ]}
              onPress={() => {
                setCustomMode("single");
                setSelectedPreset(null);
              }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  customMode === "single" && styles.modeButtonTextActive,
                ]}
              >
                Fecha específica
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                customMode === "range" && styles.modeButtonActive,
              ]}
              onPress={() => {
                setCustomMode("range");
                setSelectedPreset(null);
              }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  customMode === "range" && styles.modeButtonTextActive,
                ]}
              >
                Rango de fechas
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Inputs */}
          {customMode === "single" ? (
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowSinglePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={DesignTokens.colors.neutral[600]}
              />
              <Text style={styles.dateInputText}>
                {format(singleDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.dateRangeInputs}>
              <TouchableOpacity
                style={[styles.dateInput, styles.dateInputHalf]}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={DesignTokens.colors.neutral[600]}
                />
                <Text style={styles.dateInputText}>
                  {format(startDate, "dd MMM yyyy", { locale: es })}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>a</Text>
              <TouchableOpacity
                style={[styles.dateInput, styles.dateInputHalf]}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={DesignTokens.colors.neutral[600]}
                />
                <Text style={styles.dateInputText}>
                  {format(endDate, "dd MMM yyyy", { locale: es })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Limpiar filtro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Aplicar</Text>
          </TouchableOpacity>
        </View>

        {/* Date Pickers */}
        {showSinglePicker && (
          <DateTimePicker
            value={singleDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowSinglePicker(false);
              if (selectedDate) {
                setSingleDate(selectedDate);
                setSelectedPreset(null);
              }
            }}
            maximumDate={new Date()}
          />
        )}

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
                setSelectedPreset(null);
              }
            }}
            maximumDate={new Date()}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) {
                setEndDate(selectedDate);
                setSelectedPreset(null);
              }
            }}
            maximumDate={new Date()}
          />
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: getResponsiveSpacing(DesignTokens.spacing.lg),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
    paddingBottom: getResponsiveSpacing(DesignTokens.spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  title: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[800],
  },
  closeButton: {
    padding: getResponsiveSpacing(DesignTokens.spacing.xs),
  },
  section: {
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.neutral[800],
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  presetChip: {
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.md),
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.sm),
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: DesignTokens.colors.background.tertiary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  presetChipActive: {
    backgroundColor: DesignTokens.colors.primary[100],
    borderColor: DesignTokens.colors.primary[500],
  },
  presetText: {
    fontSize: getResponsiveFontSize(14),
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  presetTextActive: {
    color: DesignTokens.colors.primary[500],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  modeSelector: {
    flexDirection: "row",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.md),
    backgroundColor: DesignTokens.colors.background.tertiary,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 2,
  },
  modeButton: {
    flex: 1,
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.sm),
    alignItems: "center",
    borderRadius: DesignTokens.borderRadius.sm,
  },
  modeButtonActive: {
    backgroundColor: DesignTokens.colors.background.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeButtonText: {
    fontSize: getResponsiveFontSize(14),
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  modeButtonTextActive: {
    color: DesignTokens.colors.neutral[800],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    padding: getResponsiveSpacing(DesignTokens.spacing.md),
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: DesignTokens.colors.background.tertiary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    gap: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  dateInputHalf: {
    flex: 1,
  },
  dateInputText: {
    fontSize: getResponsiveFontSize(14),
    color: DesignTokens.colors.neutral[800],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  dateRangeInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  dateRangeSeparator: {
    fontSize: getResponsiveFontSize(14),
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  actions: {
    flexDirection: "row",
    gap: getResponsiveSpacing(DesignTokens.spacing.md),
    marginTop: "auto",
    paddingTop: getResponsiveSpacing(DesignTokens.spacing.lg),
  },
  clearButton: {
    flex: 1,
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.md),
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: getResponsiveFontSize(16),
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  applyButton: {
    flex: 1,
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.md),
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: DesignTokens.colors.primary[500],
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: getResponsiveFontSize(16),
    color: DesignTokens.colors.background.primary,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
});

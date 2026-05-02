import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import {
  getResponsiveSpacing,
  getResponsiveFontSize,
} from "src/utils/responsive";
import { DateUtils } from "src/utils/dateUtils";
import { DateRangePickerModal } from "./DateRangePickerModal";

export interface DateFilter {
  type: "range" | "single";
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  date?: string; // YYYY-MM-DD (single date)
  label?: string; // Display label for the filter
}

interface DateRangeFilterProps {
  value: DateFilter | null;
  onChange: (dateFilter: DateFilter | null) => void;
  style?: object;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const getDisplayText = (): string => {
    if (!value) return "Filtrar por fecha";

    if (value.label) return value.label;

    try {
      if (value.type === "single" && value.date) {
        return DateUtils.formatUTCForDisplay(value.date, "dd MMM yyyy");
      }

      if (value.type === "range" && value.startDate && value.endDate) {
        const start = DateUtils.formatUTCForDisplay(value.startDate, "dd MMM");
        const end = DateUtils.formatUTCForDisplay(value.endDate, "dd MMM yyyy");
        return `${start} - ${end}`;
      }
    } catch (error) {
      console.warn("🚨 Date display error in filter:", { value, error });
      return "Fecha inválida";
    }

    return "Fecha seleccionada";
  };

  const hasActiveFilter = !!value;

  const handleClearFilter = () => {
    onChange(null);
  };

  return (
    <>
      <View style={[styles.container, style]}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            hasActiveFilter && styles.filterChipActive,
          ]}
          onPress={() => setModalVisible(true)}
          accessibilityLabel="Filtrar por fecha"
          accessibilityHint="Selecciona un rango de fechas para filtrar los avances"
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={
              hasActiveFilter
                ? DesignTokens.colors.primary[500]
                : DesignTokens.colors.neutral[600]
            }
            style={styles.icon}
          />
          <Text
            style={[
              styles.filterText,
              hasActiveFilter && styles.filterTextActive,
            ]}
            numberOfLines={1}
          >
            {getDisplayText()}
          </Text>
          {hasActiveFilter && (
            <TouchableOpacity
              onPress={handleClearFilter}
              style={styles.clearButton}
              accessibilityLabel="Limpiar filtro de fecha"
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={DesignTokens.colors.primary[500]}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      <DateRangePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onApply={(dateFilter) => {
          onChange(dateFilter);
          setModalVisible(false);
        }}
        initialValue={value}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: getResponsiveSpacing(2),
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: getResponsiveSpacing(8),
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: DesignTokens.colors.background.tertiary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    maxWidth: 180,
  },
  filterChipActive: {
    backgroundColor: DesignTokens.colors.primary[100],
    borderColor: DesignTokens.colors.primary[500],
  },
  icon: {
    marginRight: getResponsiveSpacing(1.5),
  },
  filterText: {
    fontSize: getResponsiveFontSize(14),
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
    flex: 1,
  },
  filterTextActive: {
    color: DesignTokens.colors.primary[500],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  clearButton: {
    marginLeft: getResponsiveSpacing(1),
    padding: 2,
  },
});

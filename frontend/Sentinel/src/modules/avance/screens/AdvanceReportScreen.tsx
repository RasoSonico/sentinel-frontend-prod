import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

import { AvanceStackParamList } from "src/navigation/types";
import { DesignTokens } from "src/styles/designTokens";
import {
  downloadAdvanceReport,
  ReportScope,
  ReportError,
} from "../services/reportService";

type RouteProps = RouteProp<AvanceStackParamList, "AdvanceReport">;

type ScopeOption = {
  value: ReportScope;
  title: string;
  description: string;
};

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    value: "all",
    title: "Todos los conceptos",
    description:
      "Incluye todos los conceptos activos del catálogo, independientemente de si tienen avances en el periodo. (10 columnas)",
  },
  {
    value: "period",
    title: "Solo conceptos con avance",
    description:
      "Filtra el reporte para mostrar únicamente los conceptos con al menos un avance registrado en el rango seleccionado. (7 columnas)",
  },
];

// Returns today as a Date at midnight local time
const today = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Returns the first day of the current month
const firstOfMonth = (): Date => {
  const d = today();
  d.setDate(1);
  return d;
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const toISODate = (date: Date): string => date.toISOString().split("T")[0];

const AdvanceReportScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const { constructionId, constructionName } = route.params;

  // Date state
  const [dateFrom, setDateFrom] = useState<Date>(firstOfMonth());
  const [dateTo, setDateTo] = useState<Date>(today());

  // Picker visibility (Android shows inline modal, iOS uses inline)
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Scope state
  const [scope, setScope] = useState<ReportScope>("all");

  // Request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFromChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowFromPicker(Platform.OS === "ios");
    if (!date) return;
    setDateFrom(date);
    // Clamp dateTo if it's before dateFrom
    if (date > dateTo) setDateTo(date);
    setError(null);
  };

  const handleToChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowToPicker(Platform.OS === "ios");
    if (!date) return;
    setDateTo(date);
    setError(null);
  };

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      await downloadAdvanceReport({
        constructionId,
        dateFrom: toISODate(dateFrom),
        dateTo: toISODate(dateTo),
        scope,
      });
    } catch (err) {
      if (err instanceof ReportError) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Seleccionar rango de fechas</Text>
          <Text style={styles.sectionSubtitle}>
            {constructionName
              ? `Obra: ${constructionName}`
              : "Elige el periodo para la generación del reporte."}
          </Text>
        </View>

        {/* Date cards */}
        <View style={styles.dateCards}>
          {/* Start date */}
          <TouchableOpacity
            style={styles.dateCard}
            onPress={() => {
              setShowToPicker(false);
              setShowFromPicker(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dateCardLeft}>
              <View style={styles.dateCardLabelRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={DesignTokens.colors.primary[500]}
                />
                <Text style={styles.dateCardLabel}>Fecha inicial</Text>
              </View>
              <Text style={styles.dateCardSubLabel}>
                Inicio del periodo seleccionado
              </Text>
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>{formatDate(dateFrom)}</Text>
              </View>
            </View>
            <View style={styles.dateCardIcon}>
              <Ionicons
                name="calendar"
                size={24}
                color={DesignTokens.colors.primary[500]}
              />
            </View>
          </TouchableOpacity>

          {showFromPicker && (
            <DateTimePicker
              value={dateFrom}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={handleFromChange}
              maximumDate={today()}
            />
          )}

          {/* End date */}
          <TouchableOpacity
            style={styles.dateCard}
            onPress={() => {
              setShowFromPicker(false);
              setShowToPicker(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dateCardLeft}>
              <View style={styles.dateCardLabelRow}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={16}
                  color={DesignTokens.colors.primary[500]}
                />
                <Text style={styles.dateCardLabel}>Fecha final</Text>
              </View>
              <Text style={styles.dateCardSubLabel}>
                Fin del periodo seleccionado
              </Text>
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>{formatDate(dateTo)}</Text>
              </View>
            </View>
            <View style={styles.dateCardIcon}>
              <Ionicons
                name="calendar-sharp"
                size={24}
                color={DesignTokens.colors.primary[500]}
              />
            </View>
          </TouchableOpacity>

          {showToPicker && (
            <DateTimePicker
              value={dateTo}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={handleToChange}
              minimumDate={dateFrom}
            />
          )}
        </View>

        {/* Scope section */}
        <View style={styles.scopeSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alcance del reporte</Text>
            <Text style={styles.sectionSubtitle}>
              Define qué elementos se incluirán en la generación del documento.
            </Text>
          </View>

          <View style={styles.scopeOptions}>
            {SCOPE_OPTIONS.map((option) => {
              const selected = scope === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.scopeCard,
                    selected && styles.scopeCardSelected,
                  ]}
                  onPress={() => setScope(option.value)}
                  activeOpacity={0.8}
                >
                  {/* Radio indicator */}
                  <View style={styles.scopeRadioWrapper}>
                    <View
                      style={[
                        styles.scopeRadioOuter,
                        selected && styles.scopeRadioOuterSelected,
                      ]}
                    >
                      {selected && <View style={styles.scopeRadioInner} />}
                    </View>
                  </View>
                  <View style={styles.scopeTextWrapper}>
                    <Text
                      style={[
                        styles.scopeTitle,
                        selected && styles.scopeTitleSelected,
                      ]}
                    >
                      {option.title}
                    </Text>
                    <Text style={styles.scopeDescription}>
                      {option.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={DesignTokens.colors.neutral[400]}
          />
          <Text style={styles.infoText}>
            El reporte incluye todos los volúmenes registrados en el periodo,
            independientemente de su estado de aprobación.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={DesignTokens.colors.error[600]}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.generateButton,
            loading && styles.generateButtonLoading,
          ]}
          onPress={handleGenerate}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generar Reporte</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: DesignTokens.spacing.lg,
    gap: DesignTokens.spacing["2xl"],
    paddingBottom: DesignTokens.spacing["3xl"],
  },

  // Section headers
  sectionHeader: {
    gap: DesignTokens.spacing.xs,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.fontSize.xl,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
  },
  sectionSubtitle: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
  },

  // Date cards
  dateCards: {
    gap: DesignTokens.spacing.md,
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.lg,
    padding: DesignTokens.spacing.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[100],
    ...DesignTokens.shadows.sm,
  },
  dateCardLeft: {
    gap: DesignTokens.spacing.xs,
  },
  dateCardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing.xs,
  },
  dateCardLabel: {
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
  },
  dateCardSubLabel: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[400],
  },
  datePill: {
    alignSelf: "flex-start",
    backgroundColor: `${DesignTokens.colors.primary[500]}1A`,
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.base,
  },
  datePillText: {
    fontSize: DesignTokens.typography.fontSize.xs,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[600],
  },
  dateCardIcon: {
    width: 56,
    height: 56,
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: `${DesignTokens.colors.primary[500]}0D`,
    borderWidth: 1,
    borderColor: `${DesignTokens.colors.primary[500]}1A`,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  // Scope section
  scopeSection: {
    gap: DesignTokens.spacing.lg,
  },
  scopeOptions: {
    gap: DesignTokens.spacing.md,
  },
  scopeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.lg,
    padding: DesignTokens.spacing.lg,
    borderWidth: 1.5,
    borderColor: DesignTokens.colors.neutral[100],
  },
  scopeCardSelected: {
    borderColor: DesignTokens.colors.primary[500],
    backgroundColor: `${DesignTokens.colors.primary[500]}08`,
  },
  scopeRadioWrapper: {
    paddingTop: 2,
  },
  scopeRadioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: DesignTokens.colors.neutral[300],
    justifyContent: "center",
    alignItems: "center",
  },
  scopeRadioOuterSelected: {
    borderColor: DesignTokens.colors.primary[500],
  },
  scopeRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DesignTokens.colors.primary[500],
  },
  scopeTextWrapper: {
    flex: 1,
    gap: DesignTokens.spacing.xs,
  },
  scopeTitle: {
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
  },
  scopeTitleSelected: {
    color: DesignTokens.colors.primary[700],
  },
  scopeDescription: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[500],
    lineHeight: DesignTokens.typography.fontSize.xs * 1.6,
  },

  // Info card
  infoCard: {
    flexDirection: "row",
    gap: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: DesignTokens.borderRadius.lg,
    padding: DesignTokens.spacing.lg,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[100],
  },
  infoText: {
    flex: 1,
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[600],
    lineHeight: DesignTokens.typography.fontSize.sm * 1.6,
  },

  // Footer
  footer: {
    padding: DesignTokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[100],
    backgroundColor: DesignTokens.colors.background.primary,
    gap: DesignTokens.spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing.xs,
    backgroundColor: DesignTokens.colors.error[50],
    borderRadius: DesignTokens.borderRadius.base,
    padding: DesignTokens.spacing.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.error[200],
  },
  errorText: {
    flex: 1,
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.error[700],
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing.sm,
    backgroundColor: DesignTokens.colors.executive.primary,
    paddingVertical: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.borderRadius.lg,
    ...DesignTokens.shadows.md,
  },
  generateButtonLoading: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.background.primary,
  },
});

export default AdvanceReportScreen;

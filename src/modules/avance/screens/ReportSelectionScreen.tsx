import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { ReportesStackParamList } from "src/navigation/types";
import { DesignTokens } from "src/styles/designTokens";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";

type NavigationProp = StackNavigationProp<
  ReportesStackParamList,
  "ReportSelection"
>;

interface ReportOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  available: boolean;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: "advance",
    title: "Tabla de Avances",
    description:
      "Seguimiento cuantitativo de conceptos y avance físico del proyecto.",
    icon: "grid-outline",
    available: true,
  },
  {
    id: "photographic",
    title: "Reporte Fotográfico",
    description:
      "Documentación visual de condiciones del sitio y actualizaciones fotográficas.",
    icon: "camera-outline",
    available: false,
  },
];

const ReportSelectionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { data: assignedConstruction } = useAssignedConstruction();

  const handleSelectReport = (option: ReportOption) => {
    if (!option.available) return;

    if (option.id === "advance") {
      navigation.navigate("AdvanceReport", {
        constructionId: assignedConstruction?.id ?? "",
        constructionName: assignedConstruction?.name ?? "",
      });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Section label */}
      <Text style={styles.sectionLabel}>Categorías disponibles</Text>

      {/* Report cards */}
      <View style={styles.cardsContainer}>
        {REPORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.card, !option.available && styles.cardDisabled]}
            onPress={() => handleSelectReport(option)}
            activeOpacity={option.available ? 0.7 : 1}
          >
            {/* Icon tile */}
            <View
              style={[
                styles.iconTile,
                !option.available && styles.iconTileDisabled,
              ]}
            >
              <Ionicons
                name={option.icon}
                size={28}
                color={
                  option.available
                    ? DesignTokens.colors.primary[500]
                    : DesignTokens.colors.neutral[400]
                }
              />
            </View>

            {/* Text */}
            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text
                  style={[
                    styles.cardTitle,
                    !option.available && styles.cardTitleDisabled,
                  ]}
                >
                  {option.title}
                </Text>
                {!option.available && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Próximamente</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.cardDescription,
                  !option.available && styles.cardDescriptionDisabled,
                ]}
              >
                {option.description}
              </Text>
            </View>

            {/* Chevron */}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                option.available
                  ? DesignTokens.colors.neutral[300]
                  : DesignTokens.colors.neutral[200]
              }
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Info hint */}
      <View style={styles.infoCard}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={DesignTokens.colors.primary[500]}
        />
        <Text style={styles.infoText}>
          Los reportes generados pueden compartirse por correo, WhatsApp u otras
          aplicaciones instaladas en el dispositivo.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  content: {
    padding: DesignTokens.spacing.lg,
  },
  sectionLabel: {
    fontSize: DesignTokens.typography.fontSize.xs,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[400],
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: DesignTokens.spacing.lg,
  },
  cardsContainer: {
    gap: DesignTokens.spacing.md,
    marginBottom: DesignTokens.spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.background.primary,
    padding: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[100],
    ...DesignTokens.shadows.base,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: `${DesignTokens.colors.primary[500]}1A`, // ~10% opacity
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  iconTileDisabled: {
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  cardText: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing.sm,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
  },
  cardTitleDisabled: {
    color: DesignTokens.colors.neutral[500],
  },
  cardDescription: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
    lineHeight: DesignTokens.typography.fontSize.sm * 1.5,
  },
  cardDescriptionDisabled: {
    color: DesignTokens.colors.neutral[400],
  },
  comingSoonBadge: {
    backgroundColor: DesignTokens.colors.neutral[100],
    paddingHorizontal: DesignTokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: DesignTokens.borderRadius.full,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
  },
  infoCard: {
    flexDirection: "row",
    gap: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.lg,
    padding: DesignTokens.spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: DesignTokens.colors.neutral[200],
  },
  infoText: {
    flex: 1,
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[600],
    lineHeight: DesignTokens.typography.fontSize.sm * 1.6,
  },
});

export default ReportSelectionScreen;

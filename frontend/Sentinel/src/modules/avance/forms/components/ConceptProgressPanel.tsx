import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { DesignTokens } from "src/styles/designTokens";
import { AvanceBaseConcept } from "src/realm/avanceBase/Concept";

interface ConceptProgressPanelProps {
  concept: AvanceBaseConcept;
  inputValue: string;
}

export function ConceptProgressPanel({
  concept,
  inputValue,
}: ConceptProgressPanelProps) {
  const { total, cumulative, left, isOverContracted } = useMemo(() => {
    const total = parseFloat(concept.quantity) || 0;
    const previousCumulative = parseFloat(concept.cumulative_volume) || 0;
    const input = parseFloat(inputValue) || 0;

    const cumulative = previousCumulative + input;
    const left = total - cumulative;

    return { total, cumulative, left, isOverContracted: left < 0 };
  }, [concept.quantity, concept.cumulative_volume, inputValue]);

  const unit = concept.unit;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ProgressItem
          label="Total contratado"
          value={total}
          unit={unit}
          valueStyle={styles.valueNeutral}
        />
        <ProgressItem
          label="Acumulado"
          value={cumulative}
          unit={unit}
          valueStyle={styles.valueCumulative}
        />
        <ProgressItem
          label="Restante"
          value={left}
          unit={unit}
          valueStyle={isOverContracted ? styles.valueWarning : styles.valueLeft}
        />
      </View>

      {isOverContracted && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Estás registrando una cantidad mayor a la contratada, verifica que
            sea correcto.
          </Text>
        </View>
      )}
    </View>
  );
}

interface ProgressItemProps {
  label: string;
  value: number;
  unit: string;
  valueStyle: object;
}

function ProgressItem({ label, value, unit, valueStyle }: ProgressItemProps) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueStyle]}>
        {value.toFixed(2)} {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: DesignTokens.spacing.sm,
    gap: DesignTokens.spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: DesignTokens.colors.background.secondary,
    borderRadius: DesignTokens.borderRadius.md,
    paddingVertical: DesignTokens.spacing.sm,
    paddingHorizontal: DesignTokens.spacing.md,
  },
  item: {
    alignItems: "center",
    flex: 1,
  },
  label: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    marginBottom: 2,
  },
  value: {
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    textAlign: "center",
  },
  valueNeutral: {
    color: DesignTokens.colors.neutral[700],
  },
  valueCumulative: {
    color: DesignTokens.colors.primary[600],
  },
  valueLeft: {
    color: DesignTokens.colors.success[600],
  },
  valueWarning: {
    color: DesignTokens.colors.error[600],
  },
  warningContainer: {
    backgroundColor: DesignTokens.colors.error[50],
    borderLeftWidth: 3,
    borderLeftColor: DesignTokens.colors.error[600],
    borderRadius: DesignTokens.borderRadius.sm,
    paddingVertical: DesignTokens.spacing.xs,
    paddingHorizontal: DesignTokens.spacing.sm,
  },
  warningText: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.error[700],
    lineHeight:
      DesignTokens.typography.fontSize.xs *
      DesignTokens.typography.lineHeight.normal,
  },
});

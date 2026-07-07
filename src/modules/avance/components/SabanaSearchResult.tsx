import React, { memo } from "react";
import { View, Text } from "react-native";
import { SearchResultItem } from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import styles from "../styles/SabanaScreen.styles";
import { DesignTokens } from "src/styles/designTokens";

const CRUMB_COLORS: Record<
  number,
  { bg: string; text: string; border: string }
> = {
  1: {
    bg: DesignTokens.colors.neutral[100],
    text: DesignTokens.colors.neutral[700],
    border: "#6B7280",
  },
  2: {
    bg: DesignTokens.colors.neutral[100],
    text: DesignTokens.colors.neutral[500],
    border: "#9CA3AF",
  },
  3: {
    bg: DesignTokens.colors.neutral[100],
    text: DesignTokens.colors.neutral[400],
    border: "#D1D5DB",
  },
};

function pctBarColor(pct: number): string {
  if (pct === 0) return DesignTokens.colors.neutral[300];
  if (pct >= 60) return DesignTokens.colors.success[500];
  if (pct >= 30) return DesignTokens.colors.warning[500];
  return DesignTokens.colors.error[500];
}

function pctTextColor(pct: number): string {
  if (pct === 0) return DesignTokens.colors.neutral[400];
  if (pct >= 60) return DesignTokens.colors.success[600];
  if (pct >= 30) return DesignTokens.colors.warning[700];
  return DesignTokens.colors.error[700];
}

interface Props {
  item: SearchResultItem;
}

const SabanaSearchResult: React.FC<Props> = ({ item }) => {
  const { concept, ancestors } = item;
  const pct = Math.round(concept.pct);
  const clr = pctTextColor(pct);
  const barClr = pctBarColor(pct);

  return (
    <View style={styles.searchResult}>
      {/* Breadcrumb path */}
      <View style={styles.crumbs}>
        {ancestors.map((ancestor, idx) => {
          const c = CRUMB_COLORS[ancestor.level] ?? CRUMB_COLORS[3];
          return (
            <React.Fragment key={`${ancestor.name}-${idx}`}>
              <Text
                style={[
                  styles.crumbBadge,
                  {
                    backgroundColor: c.bg,
                    color: c.text,
                    borderWidth: 0.5,
                    borderColor: c.border,
                  },
                ]}
              >
                {ancestor.name}
              </Text>
              {idx < ancestors.length - 1 && (
                <Text style={styles.crumbSep}>›</Text>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* WBS code */}
      {concept.wbs_code ? (
        <Text style={styles.searchResultWbs}>{concept.wbs_code}</Text>
      ) : null}

      {/* Description */}
      <Text style={styles.searchResultDesc} numberOfLines={2}>
        {concept.description}
      </Text>

      {/* Quantities + pct */}
      <View style={styles.searchResultMetaRow}>
        <View style={styles.searchResultNums}>
          <Text style={styles.searchResultNum}>
            Cont:{" "}
            <Text style={styles.searchResultNumValue}>
              {concept.quantity.toLocaleString("es-MX")} {concept.unit}
            </Text>
          </Text>
          <Text style={styles.searchResultNum}>
            Ejec:{" "}
            <Text style={styles.searchResultNumValue}>
              {concept.cumulative_volume.toLocaleString("es-MX")} {concept.unit}
            </Text>
          </Text>
        </View>
        <View style={styles.searchResultPct}>
          <View style={[styles.statusDot, { backgroundColor: barClr }]} />
          <Text style={[styles.rowPct, { color: clr, fontSize: 13 }]}>
            {pct}%
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.conceptBarBg, { marginTop: 6 }]}>
        <View
          style={[
            styles.conceptBarFill,
            { width: `${pct}%`, backgroundColor: barClr },
          ]}
        />
      </View>
    </View>
  );
};

export default memo(SabanaSearchResult);

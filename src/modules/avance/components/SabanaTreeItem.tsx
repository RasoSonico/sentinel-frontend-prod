import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  FlatTreeItem,
  FlatTreeItemConcept,
  FlatTreeItemSection,
  FlatTreeItemWorkItem,
} from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import styles, {
  DEPTH_BORDER_COLOR,
  DEPTH_INDENT,
} from "../styles/SabanaScreen.styles";
import { DesignTokens } from "src/styles/designTokens";

function pctColor(pct: number): string {
  if (pct === 0) return DesignTokens.colors.neutral[400];
  if (pct >= 60) return DesignTokens.colors.success[600];
  if (pct >= 30) return DesignTokens.colors.warning[700];
  return DesignTokens.colors.error[700];
}

function barColor(pct: number): string {
  if (pct === 0) return DesignTokens.colors.neutral[300];
  if (pct >= 60) return DesignTokens.colors.success[500];
  if (pct >= 30) return DesignTokens.colors.warning[500];
  return DesignTokens.colors.error[500];
}

// ── WorkItem row (N1) ─────────────────────────────────────────────────────────

const WorkItemRow: React.FC<{
  item: FlatTreeItemWorkItem;
  onToggle: (key: string) => void;
}> = memo(({ item, onToggle }) => {
  const pct = Math.round(item.pct);
  return (
    <View
      style={[
        styles.treeRow,
        { borderLeftWidth: 3, borderLeftColor: DEPTH_BORDER_COLOR[0] },
      ]}
    >
      <TouchableOpacity
        style={styles.treeRowHeader}
        onPress={() => onToggle(item.nodeKey)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={item.isExpanded ? "chevron-down" : "chevron-forward"}
          size={14}
          color={DesignTokens.colors.neutral[400]}
        />
        <View style={styles.rowNameBlock}>
          <Text
            style={[styles.rowName, styles.rowNameWorkItem]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text
            style={[
              styles.rowPct,
              { color: pctColor(pct), fontSize: 15, fontWeight: "700" },
            ]}
          >
            {pct}%
          </Text>
          <View style={styles.rowMiniBar}>
            <View
              style={[
                styles.rowMiniBarFill,
                { width: `${Math.min(100, pct)}%`, backgroundColor: barColor(pct) },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ── Section row (N2 / N3) ─────────────────────────────────────────────────────

const SectionRow: React.FC<{
  item: FlatTreeItemSection;
  onToggle: (key: string) => void;
}> = memo(({ item, onToggle }) => {
  const depth = item.depth as 1 | 2;
  const pct = Math.round(item.pct);
  const nameStyle =
    item.level === 2 ? styles.rowNameSection2 : styles.rowNameSection3;

  return (
    <View
      style={[
        styles.treeRow,
        {
          marginLeft: 12 + DEPTH_INDENT[depth],
          borderLeftWidth: item.level === 2 ? 2 : 1.5,
          borderLeftColor: DEPTH_BORDER_COLOR[depth],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.treeRowHeader, styles.treeRowHeaderIndented]}
        onPress={() => onToggle(item.nodeKey)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={item.isExpanded ? "chevron-down" : "chevron-forward"}
          size={13}
          color={DesignTokens.colors.neutral[400]}
        />
        <View style={styles.rowNameBlock}>
          <Text style={[styles.rowName, nameStyle]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text
            style={[
              styles.rowPct,
              { color: pctColor(pct), fontSize: item.level === 2 ? 14 : 13 },
            ]}
          >
            {pct}%
          </Text>
          <View style={styles.rowMiniBar}>
            <View
              style={[
                styles.rowMiniBarFill,
                { width: `${Math.min(100, pct)}%`, backgroundColor: barColor(pct) },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ── Concept row (leaf) ────────────────────────────────────────────────────────

const ConceptRow: React.FC<{ item: FlatTreeItemConcept }> = memo(({ item }) => {
  const { concept, depth } = item;
  const pct = Math.round(concept.pct);
  const clr = pctColor(pct);

  return (
    <View
      style={[
        styles.conceptRow,
        {
          marginLeft: 12 + DEPTH_INDENT[depth],
          borderLeftWidth: 1.5,
          borderLeftColor: DEPTH_BORDER_COLOR[depth],
        },
      ]}
    >
      <View style={styles.conceptTop}>
        {concept.wbs_code ? (
          <Text style={styles.conceptWbs}>{concept.wbs_code}</Text>
        ) : (
          <View />
        )}
        <Text style={[styles.conceptPct, { color: clr }]}>{pct}%</Text>
      </View>
      <Text style={styles.conceptDesc} numberOfLines={2}>
        {concept.description}
      </Text>
      <View style={styles.conceptNums}>
        <Text style={styles.conceptNum}>
          Cont:{" "}
          <Text style={styles.conceptNumValue}>
            {concept.quantity.toLocaleString("es-MX")} {concept.unit}
          </Text>
        </Text>
        <Text style={styles.conceptNum}>
          Ejec:{" "}
          <Text style={styles.conceptNumValue}>
            {concept.cumulative_volume.toLocaleString("es-MX")} {concept.unit}
          </Text>
        </Text>
      </View>
      <View style={styles.conceptBarBg}>
        <View
          style={[
            styles.conceptBarFill,
            { width: `${Math.min(100, pct)}%`, backgroundColor: barColor(pct) },
          ]}
        />
      </View>
    </View>
  );
});

// ── Unified renderer ──────────────────────────────────────────────────────────

interface Props {
  item: FlatTreeItem;
  onToggle: (nodeKey: string) => void;
}

const SabanaTreeItem: React.FC<Props> = ({ item, onToggle }) => {
  if (item.type === "workitem") {
    return <WorkItemRow item={item} onToggle={onToggle} />;
  }
  if (item.type === "section") {
    return <SectionRow item={item} onToggle={onToggle} />;
  }
  return <ConceptRow item={item} />;
};

export default memo(SabanaTreeItem);

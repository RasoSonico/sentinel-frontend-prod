import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  FlatTreeItem,
  FlatTreeItemConcept,
  FlatTreeItemSection,
  FlatTreeItemWorkItem,
  SabanaConceptNode,
} from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import ChipPrograma from "./ChipPrograma";
import {
  colorBarra,
  colorPorcentaje,
  estaSobreEjecutado,
} from "../utils/coloresAvance";
import { fechaCorta } from "../utils/fechaPrograma";
import styles, {
  DEPTH_BORDER_COLOR,
  DEPTH_INDENT,
} from "../styles/SabanaScreen.styles";
import { DesignTokens } from "src/styles/designTokens";

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
              { color: colorPorcentaje(pct), fontSize: 15, fontWeight: "700" },
            ]}
          >
            {pct}%
          </Text>
          <View style={styles.rowMiniBar}>
            <View
              style={[
                styles.rowMiniBarFill,
                { width: `${Math.min(100, pct)}%`, backgroundColor: colorBarra(pct) },
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
              { color: colorPorcentaje(pct), fontSize: item.level === 2 ? 14 : 13 },
            ]}
          >
            {pct}%
          </Text>
          <View style={styles.rowMiniBar}>
            <View
              style={[
                styles.rowMiniBarFill,
                { width: `${Math.min(100, pct)}%`, backgroundColor: colorBarra(pct) },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ── Concept row (leaf) ────────────────────────────────────────────────────────

const ConceptRow: React.FC<{
  item: FlatTreeItemConcept;
  onOpenFicha: (concept: SabanaConceptNode) => void;
}> = memo(({ item, onOpenFicha }) => {
  const { concept, depth } = item;
  const pct = Math.round(concept.pct);
  const clr = colorPorcentaje(pct);

  return (
    // Un solo destino por fila (enmienda E9): tocarla abre la ficha, y la
    // captura se alcanza desde el CTA de esa ficha. El "+" por card se retiró
    // por carga cognitiva: cientos de filas con un botón cada una compiten con
    // la información que la sábana existe para mostrar.
    <TouchableOpacity
      style={[
        styles.conceptRow,
        {
          marginLeft: 12 + DEPTH_INDENT[depth],
          borderLeftWidth: 1.5,
          borderLeftColor: DEPTH_BORDER_COLOR[depth],
        },
      ]}
      onPress={() => onOpenFicha(concept)}
      activeOpacity={0.6}
    >
      <View style={styles.conceptTop}>
        {concept.wbs_code ? (
          <Text style={styles.conceptWbs}>{concept.wbs_code}</Text>
        ) : (
          <View />
        )}
        <View style={styles.conceptPctWrap}>
          <ChipPrograma
            programa={concept.programa}
            sobreEjecutado={estaSobreEjecutado(pct)}
          />
          <Text style={[styles.conceptPct, { color: clr }]}>{pct}%</Text>
        </View>
      </View>
      <Text style={styles.conceptDesc} numberOfLines={2}>
        {concept.description}
      </Text>
      {concept.programa?.vencido ? (
        // "Prog. a hoy" deja de significar algo cuando el programa ya cerró: a
        // esa altura siempre es el volumen total, y llamarlo "a hoy" sugiere una
        // vara que se sigue moviendo cuando ya se detuvo. Lo accionable es
        // cuándo venció y cuánto quedó debiendo.
        <View style={styles.conceptNums}>
          <Text style={styles.conceptNum}>
            Venció{" "}
            <Text style={styles.conceptNumValue}>
              {fechaCorta(concept.programa.vencido.fechaFin)}
            </Text>
            {" · faltan "}
            <Text style={styles.conceptNumValue}>
              {concept.programa.vencido.faltante.toLocaleString("es-MX", {
                maximumFractionDigits: 1,
              })}
            </Text>
            {/* `ejec.` va SIEMPRE al final, igual que en la línea normal: al
                recorrer la sábana unas filas están vencidas y otras no, y si el
                ejecutado cambiara de posición habría que releer cada una para
                encontrarlo. */}
            {" · ejec. "}
            <Text style={styles.conceptNumValue}>
              {concept.cumulative_volume.toLocaleString("es-MX", {
                maximumFractionDigits: 1,
              })}{" "}
              {concept.unit}
            </Text>
          </Text>
        </View>
      ) : concept.programa ? (
        // Vocabulario canónico de D14 para espacio corto.
        <View style={styles.conceptNums}>
          <Text style={styles.conceptNum}>
            Prog. a hoy{" "}
            <Text style={styles.conceptNumValue}>
              {concept.programa.programado.toLocaleString("es-MX", {
                maximumFractionDigits: 1,
              })}
            </Text>
            {" · ejec. "}
            <Text style={styles.conceptNumValue}>
              {concept.cumulative_volume.toLocaleString("es-MX", {
                maximumFractionDigits: 1,
              })}{" "}
              {concept.unit}
            </Text>
          </Text>
        </View>
      ) : (
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
      )}
      <View style={styles.barWrap}>
        <View style={styles.conceptBarBg}>
          <View
            style={[
              styles.conceptBarFill,
              { width: `${Math.min(100, pct)}%`, backgroundColor: colorBarra(pct) },
            ]}
          />
        </View>
        {concept.programa && concept.quantity > 0 ? (
          <View
            style={[
              styles.marcaProgramaFila,
              {
                left: `${Math.min(
                  100,
                  (concept.programa.programado / concept.quantity) * 100,
                )}%`,
              },
            ]}
          />
        ) : null}
      </View>
      {estaSobreEjecutado(pct) ? (
        // Único aviso que la fila puede dar sin conocer el programa: el volumen
        // rebasó lo CONTRATADO, y eso es cierto sin referencia temporal. Texto
        // imperativo y corto —el % ya dice el hecho, aquí va la acción— y
        // distinto del "Solicita una reprogramación" del programa vencido: allá
        // falta volumen, aquí sobra, y no se arreglan igual.
        <View style={styles.avisoSobre}>
          <Ionicons
            name="warning-outline"
            size={12}
            style={styles.avisoSobreIcono}
          />
          <Text style={styles.avisoSobreTexto}>Regularizar volumen</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

// ── Unified renderer ──────────────────────────────────────────────────────────

interface Props {
  item: FlatTreeItem;
  onToggle: (nodeKey: string) => void;
  /**
   * DEBE venir memoizado desde la pantalla: estas filas están envueltas en
   * `memo` y una sábana grande renderiza cientos. Una función nueva en cada
   * render del padre anularía la memoización por completo.
   */
  onOpenFicha: (concept: SabanaConceptNode) => void;
}

const SabanaTreeItem: React.FC<Props> = ({ item, onToggle, onOpenFicha }) => {
  if (item.type === "workitem") {
    return <WorkItemRow item={item} onToggle={onToggle} />;
  }
  if (item.type === "section") {
    return <SectionRow item={item} onToggle={onToggle} />;
  }
  return <ConceptRow item={item} onOpenFicha={onOpenFicha} />;
};

export default memo(SabanaTreeItem);

import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SabanaConceptNode,
  SearchResultItem,
} from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import ChipPrograma from "./ChipPrograma";
import {
  colorBarra,
  colorPorcentaje,
  estaSobreEjecutado,
} from "../utils/coloresAvance";
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

interface Props {
  item: SearchResultItem;
  /** Memoizado desde la pantalla: este componente está envuelto en `memo`. */
  onOpenFicha: (concept: SabanaConceptNode) => void;
}

const SabanaSearchResult: React.FC<Props> = ({ item, onOpenFicha }) => {
  const { concept, ancestors } = item;
  const pct = Math.round(concept.pct);
  const clr = colorPorcentaje(pct);
  const barClr = colorBarra(pct);

  return (
    // Mismo gesto que las filas del árbol (enmienda E9): un solo destino.
    <TouchableOpacity
      style={styles.searchResult}
      onPress={() => onOpenFicha(concept)}
      activeOpacity={0.6}
    >
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

      {/* Quantities + pct. Mismo lenguaje que ConceptRow (D11): el resultado de
          búsqueda es una fila más, y una fila que dijera algo distinto de la
          del árbol sobre el mismo concepto sería una contradicción a la vista. */}
      <View style={styles.searchResultMetaRow}>
        <View style={styles.searchResultNums}>
          {concept.programa ? (
            // Vocabulario canónico de D14 para espacio corto.
            <Text style={styles.searchResultNum}>
              Prog. a hoy{" "}
              <Text style={styles.searchResultNumValue}>
                {concept.programa.programado.toLocaleString("es-MX", {
                  maximumFractionDigits: 1,
                })}
              </Text>
              {" · ejec. "}
              <Text style={styles.searchResultNumValue}>
                {concept.cumulative_volume.toLocaleString("es-MX", {
                  maximumFractionDigits: 1,
                })}{" "}
                {concept.unit}
              </Text>
            </Text>
          ) : (
            <>
              <Text style={styles.searchResultNum}>
                Cont:{" "}
                <Text style={styles.searchResultNumValue}>
                  {concept.quantity.toLocaleString("es-MX")} {concept.unit}
                </Text>
              </Text>
              <Text style={styles.searchResultNum}>
                Ejec:{" "}
                <Text style={styles.searchResultNumValue}>
                  {concept.cumulative_volume.toLocaleString("es-MX")}{" "}
                  {concept.unit}
                </Text>
              </Text>
            </>
          )}
        </View>
        <View style={styles.searchResultPct}>
          <ChipPrograma
            programa={concept.programa}
            sobreEjecutado={estaSobreEjecutado(pct)}
          />
          <View style={[styles.statusDot, { backgroundColor: barClr }]} />
          <Text style={[styles.rowPct, { color: clr, fontSize: 13 }]}>
            {pct}%
          </Text>
        </View>
      </View>

      {/* Progress bar. La marca vive en el CONTENEDOR, no dentro de la barra:
          conceptBarBg recorta (overflow hidden) y ahí no podría sobresalir. */}
      <View style={[styles.barWrap, { marginTop: 6 }]}>
        <View style={styles.conceptBarBg}>
          <View
            style={[
              styles.conceptBarFill,
              { width: `${Math.min(100, pct)}%`, backgroundColor: barClr },
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
};

export default memo(SabanaSearchResult);

import React, { memo } from "react";
import { View, Text } from "react-native";
import { SabanaGlobalStats } from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import { formatCurrency } from "../utils/formatCurrency";
import styles from "../styles/SabanaScreen.styles";

interface Props {
  stats: SabanaGlobalStats;
}

/**
 * Línea compacta de métricas del catálogo activo, bajo el selector (ADR-003
 * D3). Sustituye a la SabanaGlobalCard retirada: el global de OBRA vive en la
 * franja oscura; esta línea es del CATÁLOGO. "prog." llega en Fase 2.
 * El texto muestra el % real (sin recorte); solo la barra se recorta al 100%.
 */
const SabanaCatalogMetrics: React.FC<Props> = ({ stats }) => {
  return (
    <View style={styles.catMetrics}>
      <Text style={styles.catMetricsText}>
        Físico{" "}
        <Text style={styles.catMetricsPct}>{stats.global_pct.toFixed(1)}%</Text>
        {" · "}Importe {formatCurrency(stats.total_executed)}
      </Text>
      <View style={styles.catMetricsBarBg}>
        <View
          style={[
            styles.catMetricsBarFill,
            { width: `${Math.min(100, stats.global_pct)}%` },
          ]}
        />
      </View>
    </View>
  );
};

export default memo(SabanaCatalogMetrics);

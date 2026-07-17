import React, { memo } from "react";
import { View, Text } from "react-native";
import { SabanaGlobalStats } from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import { formatCurrency } from "../utils/formatCurrency";
import styles from "../styles/SabanaScreen.styles";

// NOTA (ADR-003 D3): retirada del cuerpo de la sábana; queda disponible para
// reciclarse en una futura ficha de obra (deuda técnica #5 del ADR).

interface Props {
  stats: SabanaGlobalStats;
}

const SabanaGlobalCard: React.FC<Props> = ({ stats }) => {
  const pct = Math.round(stats.global_pct);

  return (
    <View style={styles.globalCard}>
      <View style={styles.globalCardRow}>
        <View>
          <Text style={styles.globalPct}>{pct}%</Text>
          <Text style={styles.globalPctLabel}>avance global del contrato</Text>
        </View>
      </View>
      <View style={styles.globalBarBg}>
        <View
          style={[styles.globalBarFill, { width: `${Math.min(100, pct)}%` }]}
        />
      </View>
      <View style={styles.globalMetas}>
        <Text style={styles.globalMeta}>
          Contratado: {formatCurrency(stats.total_contracted)}
        </Text>
        <Text style={styles.globalMeta}>
          Ejecutado: {formatCurrency(stats.total_executed)}
        </Text>
      </View>
    </View>
  );
};

export default memo(SabanaGlobalCard);

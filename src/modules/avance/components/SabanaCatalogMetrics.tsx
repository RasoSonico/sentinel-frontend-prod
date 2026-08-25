import React, { memo } from "react";
import { View, Text } from "react-native";
import { SabanaGlobalStats } from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import { formatCurrency } from "../utils/formatCurrency";
import { colorBarra, colorPorcentaje } from "../utils/coloresAvance";
import styles from "../styles/SabanaScreen.styles";

interface Props {
  stats: SabanaGlobalStats;
}

/**
 * Línea compacta de métricas del catálogo activo, bajo el selector (ADR-003
 * D3). Sustituye a la SabanaGlobalCard retirada: el global de OBRA vive en la
 * franja oscura; esta línea es del CATÁLOGO.
 *
 * Fase 2 activa: "Programado {pct}%" y marca en la barra, ambos condicionados por
 * D11 — un catálogo sin versión vigente no muestra nada de programa, ni
 * siquiera un 0 que se leería como atraso total.
 *
 * El texto muestra el % real (sin recorte); solo la barra se recorta al 100%.
 */
const SabanaCatalogMetrics: React.FC<Props> = ({ stats }) => {
  return (
    <View style={styles.catMetrics}>
      <Text style={styles.catMetricsText}>
        Físico{" "}
        <Text
          style={[
            styles.catMetricsPct,
            { color: colorPorcentaje(stats.global_pct) },
          ]}
        >
          {stats.global_pct.toFixed(1)}%
        </Text>
        {stats.programmed_pct !== null ? (
          <>
            {" · "}
            {/* Solo la CIFRA lleva color, igual que "Físico". El rótulo hereda
                el gris del contenedor: si la palabra también se colorea, el
                bloque entero pesa como si fuera el dato, y son tres bloques
                compitiendo en una sola línea. */}
            Programado{" "}
            <Text style={styles.catMetricsProg}>
              {stats.programmed_pct.toFixed(1)}%
            </Text>
          </>
        ) : (
          // "Sin programa cargado" NO contradice a D11. Esa regla prohíbe
          // fabricar un 0% —que se leería como atraso total— y aquí no se
          // fabrica nada: la ausencia de programa es un HECHO del catálogo, y
          // es justo el hecho que falta. Callarlo hace que un catálogo sin
          // programar se vea idéntico a uno donde el usuario simplemente no ha
          // mirado, y deja sin explicar el PROG% bajo de la franja.
          <>
            {" · "}
            <Text style={styles.catMetricsSinPrograma}>
              sin programa cargado
            </Text>
          </>
        )}
        {" · "}Importe {formatCurrency(stats.total_executed)}
      </Text>
      <View style={styles.barWrap}>
        <View style={styles.catMetricsBarBg}>
          <View
            style={[
              styles.catMetricsBarFill,
              {
                width: `${Math.min(100, stats.global_pct)}%`,
                backgroundColor: colorBarra(stats.global_pct),
              },
            ]}
          />
        </View>
        {stats.programmed_pct !== null ? (
          <View
            style={[
              styles.marcaProgramaCatalogo,
              { left: `${Math.min(100, stats.programmed_pct)}%` },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
};

export default memo(SabanaCatalogMetrics);

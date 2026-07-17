import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { formatCurrency } from "../utils/formatCurrency";
import { TodayCounts, TodayObraResumen } from "../hooks/useTodaySummary";
import styles from "./styles/HoyResumenHeader.styles";

interface Props {
  obraNombre: string | null;
  resumenObra: TodayObraResumen | null;
  counts: TodayCounts;
  onPressAvances: () => void;
  onPressFotos: () => void;
  onPressIncidencias: () => void;
  onPressReporteDia: () => void;
  onPressIncidencia: () => void;
}

/**
 * Franja ejecutiva del día (ADR-003 D2, lámina L-01 Rev D — capas de Fase 1).
 * Primer elemento del ListHeader de la sábana: viaja con el scroll, no es
 * sticky. Presentacional puro; los datos vienen de useTodaySummary.
 *
 * Anclajes de fases futuras (no construidos): PROG.% y marca en barra
 * (Fase 2), chip eco de Semana (Fase 3).
 */
const HoyResumenHeader: React.FC<Props> = ({
  obraNombre,
  resumenObra,
  counts,
  onPressAvances,
  onPressFotos,
  onPressIncidencias,
  onPressReporteDia,
  onPressIncidencia,
}) => {
  const isOnline = useNetworkStatus();

  // Display de la fecha local de hoy (solo presentación, no fecha de negocio)
  const fechaLabel = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const stats = [
    { label: "Avances", value: String(counts.avances), onPress: onPressAvances },
    { label: "Fotos", value: String(counts.fotos), onPress: onPressFotos },
    {
      label: "Incidencias",
      value: counts.incidencias === null ? "—" : String(counts.incidencias),
      onPress: onPressIncidencias,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* El bloque izquierdo cede espacio (flex + ellipsis); el % tiene su
            espacio garantizado sin importar el largo de fecha/obra */}
        <View style={styles.topLeft}>
          <Text style={styles.title} numberOfLines={1}>
            Hoy · {fechaLabel}
          </Text>
          {obraNombre ? (
            <Text style={styles.eyebrow} numberOfLines={1}>
              Obra · {obraNombre}
            </Text>
          ) : null}
        </View>
        {resumenObra ? (
          <View style={styles.pctBlock}>
            <Text style={styles.pctLabel}>AVANCE</Text>
            <Text style={styles.pctValue}>{resumenObra.pct.toFixed(1)}%</Text>
          </View>
        ) : null}
      </View>

      {resumenObra ? (
        <>
          <View style={styles.barBg}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(100, resumenObra.pct)}%` },
              ]}
            />
          </View>
          <View style={styles.importesRow}>
            <Text style={styles.importeText}>
              Ejecutado {formatCurrency(resumenObra.ejecutado)}
            </Text>
            <Text style={styles.importeText}>
              Contratado {formatCurrency(resumenObra.contratado)}
            </Text>
          </View>
        </>
      ) : null}

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <TouchableOpacity
            key={stat.label}
            style={styles.stat}
            onPress={stat.onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.btnReporte}
          onPress={onPressReporteDia}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={15} color="#fff" />
          <Text style={styles.btnReporteText}>Reporte del día</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnIncidencia}
          onPress={onPressIncidencia}
          activeOpacity={0.8}
        >
          <Ionicons name="warning-outline" size={15} color="#E2E8F0" />
          <Text style={styles.btnIncidenciaText}>Incidencia</Text>
        </TouchableOpacity>
      </View>

      {isOnline === false && (
        <View style={styles.offlineBanner}>
          <Ionicons
            name="cloud-offline-outline"
            size={12}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.offlineText}>
            Sin conexión — contadores con datos locales
          </Text>
        </View>
      )}
    </View>
  );
};

export default React.memo(HoyResumenHeader);

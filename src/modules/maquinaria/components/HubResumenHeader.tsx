import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { HubResumen } from "src/types/maquinaria";
import styles from "./styles/HubResumenHeader.styles";

export type HubFilter = "reportadas" | "sin_reportar" | "sin_operar" | null;

interface Props {
  resumen: HubResumen;
  fecha: string;
  activeFilter: HubFilter;
  onFilterPress: (filter: HubFilter) => void;
}

interface StatItem {
  filter: HubFilter;
  value: number;
  label: string;
}

const HubResumenHeader: React.FC<Props> = ({
  resumen,
  fecha,
  activeFilter,
  onFilterPress,
}) => {
  const isOnline = useNetworkStatus();

  const stats: StatItem[] = [
    { filter: null, value: resumen.total_en_sitio, label: "En sitio" },
    {
      filter: "reportadas",
      value: resumen.reportadas_hoy,
      label: "Reportadas",
    },
    {
      filter: "sin_reportar",
      value: resumen.sin_reportar,
      label: "Sin reportar",
    },
    { filter: "sin_operar", value: resumen.sin_operar, label: "Sin operar" },
  ];

  const handlePress = (filter: HubFilter) => {
    // null = "En sitio" always clears; others toggle
    onFilterPress(filter === null || activeFilter === filter ? null : filter);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Hoy ·{" "}
        {new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })}
      </Text>
      <View style={styles.statsRow}>
        {stats.map((stat, index) => {
          const isActive = activeFilter === stat.filter && stat.filter !== null;
          const isInactive = activeFilter !== null && !isActive;

          return (
            <React.Fragment key={stat.label}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={[
                  styles.stat,
                  isActive && styles.statActive,
                  isInactive && styles.statInactive,
                ]}
                onPress={() => handlePress(stat.filter)}
                activeOpacity={0.7}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
      {isOnline === false && (
        <View style={styles.offlineBanner}>
          <Ionicons
            name="cloud-offline-outline"
            size={12}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.offlineText}>
            Sin conexión — datos del último acceso
          </Text>
        </View>
      )}
    </View>
  );
};

export default React.memo(HubResumenHeader);

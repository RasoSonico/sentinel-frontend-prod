import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import styles from "./styles/HubResumenHeader.styles";

interface Props {
  fecha: string;
  /** Trabajó o no operó, enviado o en cola. El arranque no cuenta. */
  reportadas: number;
  total: number;
}

/**
 * Encabezado del hub: la fecha y la barra "N de M reportadas" (ADR-009 D8).
 *
 * Reemplaza a los cuatro contadores-filtro. La barra mide lo que el
 * supervisor controla —reportar—, y lo empuja a reportar también lo que no
 * trabajó: si no se sube, no hay certeza, solo se asume por omisión. Una
 * barra de máquinas trabajando premiaría algo que él no decide.
 */
const HubResumenHeader: React.FC<Props> = ({ fecha, reportadas, total }) => {
  const isOnline = useNetworkStatus();
  const avance = total > 0 ? Math.min(1, reportadas / total) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Hoy ·{" "}
        {new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </Text>
      <View style={styles.barraFila}>
        <View style={styles.barra}>
          <View style={[styles.barraRelleno, { width: `${avance * 100}%` }]} />
        </View>
        <Text style={styles.barraTexto}>
          {reportadas} de {total} reportadas
        </Text>
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

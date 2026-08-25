import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/ProgramStatusBadge.styles";

/**
 * Estados del programa contractual (ADR-004 D7).
 *
 * `AL_DIA` NO tiene chip: el silencio es la norma y solo se señala la
 * excepción. Cientos de chips verdes idénticos serían el ruido que D7 rechaza,
 * así que `onSchedule` quedó fuera del camino del programa.
 *
 * `completed` (morado) tampoco se usa aquí: el morado está reservado al plano
 * de producción de la Fase 3 —teal+líneas = contrato, morado+barras =
 * producción— y "completado" mide contra el CONTRATO, que es otro eje.
 */
type StatusType =
  | "onSchedule"
  | "delayed"
  | "ahead"
  | "overExecuted"
  | "completed"
  | "notStarted";
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface ProgramStatusBadgeProps {
  status: StatusType;
  compact?: boolean;
  showIcon?: boolean;
  /**
   * Sustituye la etiqueta por defecto. Lo usa `notStarted` para decir
   * "Inicia 26/07" en vez de "No iniciado": la fecha exacta de arranque es la
   * información útil, y viene de `fecha_inicio` de la fila de programa — no del
   * primer corte, que la degradaría a "en algún momento antes del corte".
   *
   * Con cadena VACÍA el chip se queda solo con el ícono. Lo aprovecha la
   * sobre-ejecución en la fila de la sábana, donde el ancho escasea y el texto
   * "Regularizar volumen" ya viaja bajo la barra.
   */
  label?: string;
}

// Definiendo tipo para la configuración
interface StatusConfigItem {
  label: string;
  color: string;
  icon: IoniconsName;
}

// Usando el tipo correcto para los nombres de iconos
const statusConfig: Record<StatusType, StatusConfigItem> = {
  onSchedule: {
    label: "En programa",
    color: "#27ae60", // Verde
    icon: "checkmark-circle" as IoniconsName,
  },
  delayed: {
    label: "Atrasado",
    color: "#e74c3c", // Rojo
    icon: "alert-circle" as IoniconsName,
  },
  // Verde, no azul: al retirar el semáforo de las barras se liberó la escala
  // rojo/ámbar/verde, y "adelantado" es la única lectura inequívocamente buena
  // del sistema. El azul además chocaba con el `primary` de marca.
  ahead: {
    label: "Adelantado",
    color: "#059669", // success[600]
    icon: "trending-up" as IoniconsName,
  },
  // Ámbar del mismo tono que el aviso "Regularizar volumen" de la fila y que la
  // alerta de sobre-ejecución de la captura: un solo ámbar para un solo hecho.
  overExecuted: {
    label: "Regularizar",
    color: "#B45309", // warning[700]
    icon: "warning-outline" as IoniconsName,
  },
  completed: {
    label: "Completado",
    color: "#9b59b6", // Morado
    icon: "trophy" as IoniconsName,
  },
  notStarted: {
    label: "No iniciado",
    color: "#7f8c8d", // Gris
    icon: "time" as IoniconsName,
  },
};

const ProgramStatusBadge: React.FC<ProgramStatusBadgeProps> = ({
  status,
  compact = false,
  showIcon = true,
  label: labelOverride,
}) => {
  const { label: labelPorDefecto, color, icon } = statusConfig[status];
  const label = labelOverride ?? labelPorDefecto;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: `${color}20` }, // 20% de opacidad del color
        compact ? styles.compactContainer : null,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={icon}
          size={compact ? 12 : 16}
          color={color}
          // Sin etiqueta el ícono queda solo: el margen derecho dejaría el chip
          // descentrado alrededor de un hueco vacío.
          style={label ? styles.icon : null}
        />
      )}

      {/* Etiqueta vacía = chip de puro ícono. Lo usa la sobre-ejecución en la
          fila de la sábana, donde el texto ya viaja debajo de la barra. */}
      {label ? (
        <Text
          style={[styles.label, { color }, compact ? styles.compactLabel : null]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
};

export default ProgramStatusBadge;

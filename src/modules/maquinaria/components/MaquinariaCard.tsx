import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";

import type { VistaMaquina } from "../diaMaquina";
import { fechaCortaLocal } from "../horometro";

interface Props {
  vista: VistaMaquina;
  /** Fecha local de hoy, para decir "ayer" o el día del cierre olvidado. */
  hoy: string;
  /** Primera del grupo: sin la línea divisoria de arriba. */
  primera: boolean;
  /**
   * Toda la tarjeta es el destino (D8, "›"). Qué abre lo decide la pantalla
   * según el motivo: la hoja, el rescate de la cola o la reconciliación.
   */
  onPress: (vista: VistaMaquina) => void;
}

const PROPIETARIO_LABELS: Record<string, string> = {
  PROPIA: "Propia",
  RENTADA: "Rentada",
  SUBCONTRATISTA: "Subcontrato",
};

export const MOTIVO_LABELS: Record<string, string> = {
  FALLA_MECANICA: "Falla mecánica",
  SIN_OPERADOR: "Sin operador",
  SIN_FRENTE: "Sin frente",
  CLIMA: "Clima",
  OTRO: "Otro",
};

const VERDE = "#10B981";
const ROJO = DesignTokens.colors.error[500];
const AMBAR = DesignTokens.colors.warning[400];
const ROJO_TEXTO = "#991B1B";
const PIZARRA = "#64748B";

/** "Ayer quedó sin final", o el día cuando no fue ayer. */
const textoSinFinal = (jornadaFecha: string, hoy: string): string => {
  const [a, m, d] = hoy.split("-").map(Number);
  const ayer = new Date(Date.UTC(a, m - 1, d - 1)).toISOString().slice(0, 10);
  return jornadaFecha === ayer
    ? "Ayer quedó sin final"
    : `El ${fechaCortaLocal(jornadaFecha)} quedó sin final`;
};

/** Posición 4: el estatus, con su punto. En atención, solo el problema. */
const estatus = (
  vista: VistaMaquina,
  hoy: string,
): { texto: string; color: string; problema: boolean } => {
  const a = vista.atencion;
  if (a?.motivo === "FALLIDA") {
    return { texto: "No se envió", color: ROJO, problema: true };
  }
  if (a?.motivo === "SIN_FINAL") {
    return { texto: textoSinFinal(a.jornadaFecha, hoy), color: ROJO, problema: true };
  }
  if (a?.motivo === "RECONCILIACION") {
    return { texto: `${a.dias} días sin reporte`, color: ROJO, problema: true };
  }
  if (vista.seccion === "TRABAJANDO") {
    const n = vista.actividades;
    return {
      texto: n === 1 ? "1 actividad" : `${n} actividades`,
      color: VERDE,
      problema: false,
    };
  }
  if (vista.estadoDia === "NO_OPERO") {
    const motivo = vista.hoy.motivo ? MOTIVO_LABELS[vista.hoy.motivo] ?? "" : "";
    return {
      texto: motivo ? `No operó · ${motivo}` : "No operó",
      color: ROJO,
      problema: false,
    };
  }
  return { texto: "Sin reportar", color: AMBAR, problema: false };
};

/**
 * Tarjeta del hub — ADR-009 D8: siete posiciones, todas las tarjetas iguales.
 *
 * ```
 * [1 Tipo]  [2 Marca]  [3 Modelo]
 * [4 Estatus]   [5 Faltante]          [6 Acción]    ›
 * [7 Propiedad]                                ☁
 * ```
 *
 * Cada dato vive siempre en el mismo lugar, así que el supervisor deja de
 * inspeccionar tarjeta por tarjeta: la sección dice el estado y la tarjeta
 * solo lo concreta. Sin botones ni avisos internos —toda la tarjeta abre— y
 * sin el patrón "cerrado": esto es dato del servidor, no algo que se edita.
 */
const MaquinariaCard: React.FC<Props> = ({ vista, hoy, primera, onPress }) => {
  const { maquina } = vista;
  const e = estatus(vista, hoy);
  const accion =
    vista.seccion === "ATENCION"
      ? "Resolver"
      : vista.seccion === "SIN_TRABAJAR" && vista.estadoDia === "SIN_REPORTAR"
        ? "Reportar"
        : null;
  // Nunca coincide con la acción: solo existe en "Trabajando".
  const faltante = vista.seccion === "TRABAJANDO" && vista.faltaHorometro;

  return (
    <TouchableOpacity
      style={[estilos.tarjeta, !primera && estilos.divisoria]}
      onPress={() => onPress(vista)}
      activeOpacity={0.7}
    >
      <View style={estilos.cuerpo}>
        {/* 1 · 2 · 3 — si no cabe, se recorta SOLO la marca. */}
        <View style={estilos.fila1}>
          <Text style={estilos.tipo}>{maquina.tipo}</Text>
          <Text style={estilos.marca} numberOfLines={1}>
            {maquina.marca}
          </Text>
          {!!maquina.modelo && <Text style={estilos.modelo}>{maquina.modelo}</Text>}
        </View>

        {/* 4 · 5 · 6 */}
        <View style={estilos.fila2}>
          <View style={[estilos.punto, { backgroundColor: e.color }]} />
          <Text
            style={[estilos.estatus, e.problema && estilos.estatusProblema]}
            numberOfLines={1}
          >
            {e.texto}
          </Text>
          {faltante && (
            <Text style={estilos.faltante} numberOfLines={1}>
              Sin horómetro
            </Text>
          )}
          <View style={estilos.espaciador} />
          {accion && (
            <Text
              style={[estilos.accion, accion === "Resolver" && estilos.accionRoja]}
            >
              {accion}
            </Text>
          )}
        </View>

        {/* 7 · ☁ */}
        <View style={estilos.fila3}>
          <Text style={estilos.propiedad}>
            {PROPIETARIO_LABELS[maquina.propietario] ?? maquina.propietario}
          </Text>
          {/* Solo el ícono de la cola, sin texto y en gris pizarra: el ámbar
              competiría con el punto de "Sin reportar". */}
          {vista.enCola && (
            <Ionicons name="cloud-upload-outline" size={15} color={PIZARRA} />
          )}
        </View>
      </View>
      <Text style={estilos.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 12,
    paddingRight: 10,
    backgroundColor: DesignTokens.colors.background.primary,
  },
  divisoria: { borderTopWidth: 1, borderTopColor: "#EEF0F3" },
  cuerpo: { flex: 1, minWidth: 0 },

  fila1: { flexDirection: "row", alignItems: "baseline", gap: 6, overflow: "hidden" },
  tipo: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#0F172A",
    flexShrink: 0,
  },
  marca: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: "#334155",
    flexShrink: 1,
    minWidth: 0,
  },
  modelo: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: "#334155",
    flexShrink: 0,
  },

  fila2: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  punto: { width: 7, height: 7, borderRadius: 4, marginRight: -3 },
  estatus: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: "#0F172A",
    flexShrink: 0,
  },
  estatusProblema: { color: ROJO_TEXTO },
  faltante: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: "#475569",
    flexShrink: 1,
  },
  espaciador: { flex: 1 },
  accion: {
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#0F172A",
    paddingLeft: 6,
  },
  accionRoja: { color: "#B91C1C" },

  fila3: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 1,
    minHeight: 15,
  },
  propiedad: { fontSize: 11, lineHeight: 15, color: "#6B7280" },

  chevron: {
    fontSize: 18,
    color: "#94A3B8",
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
});

export default memo(MaquinariaCard);

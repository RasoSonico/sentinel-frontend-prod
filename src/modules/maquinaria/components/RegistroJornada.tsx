import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";

import type { DetalleVista, TurnoVista } from "../diaMaquina";
import {
  diaCorto,
  fechaDeInstante,
  formatoHoras,
  formatoLectura,
  horaCorta,
  numeroDe,
} from "../horometro";
import type { ConceptoBuscable } from "../indiceConceptos";

/**
 * Lo YA registrado de una jornada: turnos cerrados y actividades, con hora y
 * autor (ADR-009 D3).
 *
 * **Texto sin caja, sin contorno oscuro y sin chevron.** No lleva el patrón
 * "cerrado" porque no se reabre: corregir lo enviado está fuera de esta
 * iteración, y D11 regla 2 reserva ese lenguaje para lo que sí se edita. Lo
 * que está en cola lleva solo la nube de la cola, sin texto.
 */

const NUBE = "#64748B";

const Nube = () => (
  <Ionicons name="cloud-upload-outline" size={13} color={NUBE} />
);

/**
 * La hora de una captura, con el día debajo cuando no es el de la jornada:
 * la actividad de las 03:05 de un turno nocturno del jueves dice "vie 16".
 */
const Hora: React.FC<{ instante: string | null; jornadaFecha: string }> = ({
  instante,
  jornadaFecha,
}) => {
  if (!instante) return <View style={estilos.hora} />;
  const dia = fechaDeInstante(instante);
  return (
    <View style={estilos.hora}>
      <Text style={estilos.horaTexto}>{horaCorta(instante)}</Text>
      {dia && dia !== jornadaFecha && (
        <Text style={estilos.horaDia}>{diaCorto(dia)}</Text>
      )}
    </View>
  );
};

/** "07:02 J. Pérez" — la mitad de la línea de autores de un turno. */
const momento = (instante: string | null, autor: string | null) =>
  [instante ? horaCorta(instante) : "", autor ?? ""].filter(Boolean).join(" ");

export const TurnosRegistrados: React.FC<{ turnos: TurnoVista[] }> = ({
  turnos,
}) => (
  <View>
    {turnos.map((t, i) => {
      const inicial = numeroDe(t.inicial);
      const final = numeroDe(t.final);
      const horas = numeroDe(t.horas);
      return (
        <View key={`${t.desde}-${i}`} style={estilos.turno}>
          <View style={estilos.turnoFila}>
            <Text style={estilos.turnoLecturas}>
              {inicial !== null ? formatoLectura(inicial) : "—"} →{" "}
              {t.cerradoSinFinal
                ? "sin final"
                : final !== null
                  ? formatoLectura(final)
                  : "—"}
            </Text>
            <Text style={estilos.turnoHoras}>
              {horas !== null ? `${formatoHoras(horas)} h` : ""}
            </Text>
          </View>
          <View style={estilos.turnoFila}>
            <Text style={estilos.autores}>
              {[momento(t.desde, t.autorInicio), momento(t.hasta, t.autorCierre)]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {(t.inicioEnCola || t.cierreEnCola) && <Nube />}
          </View>
        </View>
      );
    })}
  </View>
);

export const ActividadesRegistradas: React.FC<{
  detalles: DetalleVista[];
  jornadaFecha: string;
  indice: ConceptoBuscable[];
  /** Mostrar las horas estimadas: solo tienen sentido con varias. */
  conHoras: boolean;
}> = ({ detalles, jornadaFecha, indice, conHoras }) => (
  <View style={estilos.lista}>
    {detalles.map((d, i) => {
      const concepto = d.concept
        ? (indice.find((c) => c.id === d.concept) ?? null)
        : null;
      const horas = numeroDe(d.horasEstimadas);
      return (
        <View key={`${d.registradoEn}-${i}`} style={estilos.renglon}>
          <Hora instante={d.registradoEn} jornadaFecha={jornadaFecha} />
          <View style={estilos.renglonTexto}>
            <Text style={estilos.ruta} numberOfLines={1}>
              {concepto
                ? `⌕ ${concepto.ruta}${concepto.wbs ? ` · ${concepto.wbs}` : ""}`
                : d.concept
                  ? "⌕ Concepto del catálogo"
                  : "✎ Escrita"}
            </Text>
            <Text style={estilos.descripcion} numberOfLines={2}>
              {concepto ? concepto.descripcion : d.descripcion}
            </Text>
            {!!d.autor && <Text style={estilos.autor}>{d.autor}</Text>}
          </View>
          {conHoras && horas !== null && (
            <Text style={estilos.horas}>{formatoHoras(horas)} h</Text>
          )}
          {d.enCola && (
            <View style={estilos.nube}>
              <Nube />
            </View>
          )}
        </View>
      );
    })}
  </View>
);

const estilos = StyleSheet.create({
  turno: { paddingVertical: 4 },
  turnoFila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  turnoLecturas: {
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: "#0F172A",
  },
  turnoHoras: {
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#0F172A",
  },
  autores: { fontSize: 10.5, color: "#6B7280", marginTop: 2, flexShrink: 1 },

  lista: { borderTopWidth: 1, borderTopColor: "#EEF0F3", marginBottom: 6 },
  renglon: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3",
  },
  hora: { width: 40, paddingTop: 1 },
  horaTexto: {
    fontSize: 11,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: "#334155",
    fontVariant: ["tabular-nums"],
  },
  horaDia: { fontSize: 9.5, color: "#6B7280" },
  renglonTexto: { flex: 1, minWidth: 0 },
  ruta: { fontSize: 10, color: "#64748B" },
  descripcion: { fontSize: 12.5, lineHeight: 16, color: "#0F172A" },
  autor: { fontSize: 10, color: "#6B7280", marginTop: 1 },
  horas: {
    fontSize: 12,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#0F172A",
    paddingTop: 12,
  },
  nube: { paddingTop: 12 },
});

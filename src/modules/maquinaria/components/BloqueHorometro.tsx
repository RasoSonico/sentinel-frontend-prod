import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";

import { DesignTokens } from "src/styles/designTokens";
import { bloque } from "src/styles/patrones/estiloCerrado";
import {
  avisoDeLecturas,
  fechaCortaLocal,
  formatoHoras,
  formatoLectura,
  numeroDe,
  soloLectura,
} from "../horometro";

interface Props {
  inicial: string;
  final: string;
  /** Última lectura de cierre que existe, del hub cacheado. */
  sugerencia: string | null;
  fechaSugerencia: string | null;
  cerrado: boolean;
  onCambiar: (parcial: { inicial?: string; final?: string }) => void;
  onAbrir: () => void;
}

/**
 * Horómetro del día — ADR-007 D3.
 *
 * ## El inicial es un PLACEHOLDER, no un valor precargado
 *
 * El campo llega vacío mostrando en gris la última lectura de cierre. Si el
 * usuario no lo toca, ese valor se usa. Al tocarlo escribe sobre un campo
 * vacío; si borra lo escrito, vuelve la sugerencia.
 *
 * La alternativa —precargarlo como valor en gris— se descartó porque no queda
 * claro si se va a guardar. Como placeholder real, el comportamiento coincide
 * con lo que cualquiera espera de un campo.
 *
 * ## La sugerencia SIEMPRE aparece, rotulada con su fecha
 *
 * Enmienda a D3 regla 3, que la condicionaba a que no hubiera días sin
 * reporte. Esa condición no distingue "no trabajó" de "trabajó y no reportó",
 * y como las obras no tienen calendario fijo se dispararía casi siempre: el
 * usuario aprendería a ignorarla.
 *
 * Lo que la regla protegía —no borrar en silencio horas que la obra no vio—
 * se conserva **como información**: "Última lectura · 11 oct" un día 14 dice,
 * sin bloquear, que esa lectura tiene tres días.
 */
const BloqueHorometro: React.FC<Props> = ({
  inicial,
  final,
  sugerencia,
  fechaSugerencia,
  cerrado,
  onCambiar,
  onAbrir,
}) => {

  const sugerenciaNum = numeroDe(sugerencia);
  const usaSugerencia = inicial.trim() === "" && sugerenciaNum !== null;
  const inicialEfectivo = usaSugerencia ? sugerenciaNum : numeroDe(inicial);
  const finalNum = numeroDe(final);
  const horas =
    inicialEfectivo !== null && finalNum !== null
      ? finalNum - inicialEfectivo
      : null;

  const aviso = avisoDeLecturas(inicialEfectivo, finalNum);

  // ── Cerrado: una línea ───────────────────────────────────────────────
  if (cerrado && inicialEfectivo !== null && finalNum !== null) {
    return (
      <View style={[estilos.caja, bloque(true)]}>
        <TouchableOpacity
          style={estilos.linea}
          onPress={onAbrir}
          activeOpacity={0.7}
        >
          <Text style={estilos.lineaLecturas}>
            {formatoLectura(inicialEfectivo)} → {formatoLectura(finalNum)}
          </Text>
          <View style={estilos.lineaDerecha}>
            <Text style={estilos.lineaHoras}>
              {horas !== null ? `${formatoHoras(horas)} h` : ""}
            </Text>
            <Text style={estilos.editar}>editar</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Abierto: los dos campos ──────────────────────────────────────────
  return (
    <View style={[estilos.caja, bloque(false)]}>
      <View style={estilos.fila}>
        <View style={estilos.columna}>
          <Text style={estilos.etiqueta}>Inicial</Text>
          <BottomSheetTextInput
            style={estilos.entrada}
            value={inicial}
            onChangeText={(t) => onCambiar({ inicial: soloLectura(t) })}
            onFocus={onAbrir}
            // Sin `!`: `sugerencia` es texto que vino del servidor y no
            // tiene por qué ser un número. Un `toLocaleString` sobre null
            // tumba la pantalla entera.
            placeholder={
              sugerenciaNum !== null ? formatoLectura(sugerenciaNum) : "—"
            }
            placeholderTextColor={DesignTokens.colors.neutral[400]}
            inputMode="decimal"
          />
          <Text style={[estilos.pie, usaSugerencia && estilos.pieSugerencia]}>
            {usaSugerencia
              ? `Última lectura · ${fechaSugerencia ? fechaCortaLocal(fechaSugerencia) : "—"}`
              : inicial
                ? "Editado"
                : "Léelo en la máquina"}
          </Text>
        </View>

        <View style={estilos.columna}>
          <Text style={estilos.etiqueta}>Final</Text>
          <BottomSheetTextInput
            style={estilos.entrada}
            value={final}
            onChangeText={(t) => onCambiar({ final: soloLectura(t) })}
            onFocus={onAbrir}
            placeholder="—"
            placeholderTextColor={DesignTokens.colors.neutral[400]}
            inputMode="decimal"
          />
          <Text style={estilos.pie}>Léelo en la máquina</Text>
        </View>
      </View>

      {horas !== null && (
        <View style={estilos.vivo}>
          <Text style={estilos.vivoEtiqueta}>Trabajó</Text>
          <Text style={estilos.vivoHoras}>{formatoHoras(horas)} h</Text>
        </View>
      )}

      {aviso && (
        <View
          style={[
            estilos.aviso,
            aviso.tono === "alerta" ? estilos.avisoAlerta : estilos.avisoSuave,
          ]}
        >
          <Text style={estilos.avisoTexto}>{aviso.texto}</Text>
        </View>
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  caja: {
    borderRadius: DesignTokens.borderRadius.md,
    padding: 11,
  },
  linea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  lineaLecturas: {
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[900],
  },
  lineaDerecha: { flexDirection: "row", alignItems: "center", gap: 8 },
  lineaHoras: {
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
  },
  editar: {
    fontSize: 11,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[600],
  },

  fila: { flexDirection: "row", gap: 8 },
  columna: { flex: 1, minWidth: 0 },
  etiqueta: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
    marginBottom: 3,
  },
  entrada: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[900],
    backgroundColor: DesignTokens.colors.background.primary,
  },
  pie: {
    fontSize: 10.5,
    color: DesignTokens.colors.neutral[500],
    marginTop: 4,
    minHeight: 14,
  },
  pieSugerencia: {
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },

  vivo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  vivoEtiqueta: { fontSize: 12, color: DesignTokens.colors.neutral[600] },
  vivoHoras: {
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
  },

  aviso: {
    marginTop: 7,
    borderWidth: 1,
    borderRadius: DesignTokens.borderRadius.sm,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  avisoAlerta: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  avisoSuave: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  avisoTexto: { fontSize: 11, color: "#92400E" },
});

export default BloqueHorometro;

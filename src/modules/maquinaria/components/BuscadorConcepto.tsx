import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";
import {
  buscar,
  partirPorCoincidencia,
  MINIMO_LETRAS,
  TOPE_VISIBLE,
  type ConceptoBuscable,
} from "../indiceConceptos";

interface Props {
  texto: string;
  onCambiarTexto: (texto: string) => void;
  onElegir: (concepto: ConceptoBuscable) => void;
  indice: ConceptoBuscable[];
  onFocus?: () => void;
  autoFocus?: boolean;
  /**
   * Si se muestran la pista y los resultados bajo el campo.
   *
   * `false` mientras el usuario no haya elegido camino: con la pista visible
   * desde el arranque, la caja de concepto quedaba más alta que la de escribir
   * a mano y se leía primero, cuando las dos opciones deben verse a la vez.
   */
  mostrarPista?: boolean;
}

/**
 * Búsqueda de concepto de la hoja de jornada (ADR-007 D5, punto 6).
 *
 * **Sin dropdown de catálogo.** El catálogo se deduce del concepto elegido, así
 * que preguntarlo primero era un paso que el usuario pagaba para llegar al
 * dato que de verdad quería. Busca en toda la obra.
 *
 * **Sin sugerencias al entrar.** Una lista que aparece sola invita a elegir de
 * ella en vez de buscar, y las primeras cinco de un catálogo de cientos no son
 * las que nadie necesita.
 *
 * Todo sale del índice local: **funciona sin señal**.
 */
const BuscadorConcepto: React.FC<Props> = ({
  texto,
  onCambiarTexto,
  onElegir,
  indice,
  onFocus,
  autoFocus,
  mostrarPista = true,
}) => {
  const { visibles, total } = useMemo(
    () => buscar(indice, texto),
    [indice, texto],
  );

  const corto = texto.trim().length < MINIMO_LETRAS;

  return (
    <View>
      <View style={estilos.campo}>
        <Ionicons
          name="search"
          size={14}
          color={DesignTokens.colors.neutral[500]}
          style={estilos.icono}
        />
        <BottomSheetTextInput
          style={estilos.entrada}
          placeholder="Concepto del catálogo"
          placeholderTextColor={DesignTokens.colors.neutral[400]}
          value={texto}
          onChangeText={onCambiarTexto}
          onFocus={onFocus}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {!mostrarPista ? null : corto ? (
        <Text style={estilos.pista}>
          Escribe al menos {MINIMO_LETRAS} letras para buscar en el catálogo
        </Text>
      ) : total === 0 ? (
        <View style={estilos.lista}>
          <Text style={estilos.vacio}>
            Ningún concepto coincide con «{texto.trim()}»
          </Text>
        </View>
      ) : (
        <View style={estilos.lista}>
          <Text style={estilos.encabezado}>
            {total} {total === 1 ? "concepto" : "conceptos"}
          </Text>
          {visibles.map((concepto) => {
            const [antes, coincide, despues] = partirPorCoincidencia(
              concepto.descripcion,
              texto,
            );
            return (
              <TouchableOpacity
                key={concepto.id}
                style={estilos.resultado}
                onPress={() => onElegir(concepto)}
                activeOpacity={0.7}
              >
                {/* La ruta ARRIBA y en pequeño: es lo que distingue dos
                    conceptos homónimos de partidas distintas, y es la misma
                    que el usuario ya conoce de la sábana. */}
                <Text style={estilos.ruta} numberOfLines={1}>
                  {concepto.ruta}
                  {concepto.wbs ? ` · ${concepto.wbs}` : ""}
                </Text>
                <Text style={estilos.descripcion}>
                  {antes}
                  <Text style={estilos.resaltado}>{coincide}</Text>
                  {despues}
                </Text>
              </TouchableOpacity>
            );
          })}
          {total > TOPE_VISIBLE && (
            <Text style={estilos.mas}>
              y {total - TOPE_VISIBLE} más · sigue escribiendo para acotar
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    borderRadius: DesignTokens.borderRadius.base,
    paddingHorizontal: 10,
    backgroundColor: DesignTokens.colors.background.primary,
  },
  icono: { width: 14, textAlign: "center" },
  // Geometría COMPARTIDA con el campo de actividad escrita de
  // `TarjetaActividad`: las dos son la misma oferta y tienen que verse igual.
  // Si cambia una, cambia la otra.
  entrada: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    color: DesignTokens.colors.neutral[900],
  },
  pista: {
    fontSize: 11.5,
    color: DesignTokens.colors.neutral[400],
    paddingHorizontal: 2,
    paddingTop: 8,
  },
  lista: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.base,
    overflow: "hidden",
  },
  encabezado: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 9.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[400],
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  resultado: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[100],
    backgroundColor: DesignTokens.colors.background.primary,
  },
  ruta: {
    fontSize: 10,
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  descripcion: {
    fontSize: 12,
    lineHeight: 16,
    color: DesignTokens.colors.neutral[800],
  },
  resaltado: {
    backgroundColor: "#FEF3C7",
    color: DesignTokens.colors.neutral[900],
  },
  vacio: {
    padding: 10,
    fontSize: 12,
    color: DesignTokens.colors.neutral[400],
  },
  mas: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10.5,
    color: DesignTokens.colors.neutral[400],
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[100],
    backgroundColor: DesignTokens.colors.background.secondary,
  },
});

export default BuscadorConcepto;

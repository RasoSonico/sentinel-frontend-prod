import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

// NO poner `layout` de Reanimated en una vista que contenga campos de texto.
//
// `LinearTransition` anima CUALQUIER cambio de tamaño de la vista que lo
// lleva. Un campo multilínea crece al escribir, así que cada tecla disparaba
// una animación del bloque entero: la hoja se movía y volvía en milisegundos
// y el usuario veía "sombras" sin poder leer lo que tecleaba. Con el teclado
// en `adjustResize` encima, el efecto se duplica.
//
// El pliegue abierto → compacto que pide el ADR (D11, regla 7) no se consigue
// así: es un cambio de subárbol, no un cambio de tamaño del mismo nodo, y hay
// que hacerlo con animaciones de entrada/salida. Queda pendiente.
import { DesignTokens } from "src/styles/designTokens";
import BuscadorConcepto from "./BuscadorConcepto";
import type { ConceptoBuscable } from "../indiceConceptos";

export type ModoActividad = "concepto" | "escrita";

/** Una actividad mientras se captura. La hoja es dueña de la lista. */
export interface ActividadEnCaptura {
  /** Local, solo para llaves de React y para saber cuál está abierta. */
  id: string;
  modo: ModoActividad | null;
  concepto: ConceptoBuscable | null;
  /** Texto de la actividad escrita. */
  texto: string;
  /** Lo tecleado en la caja de búsqueda; no es el resultado. */
  busqueda: string;
  horas: string;
}

export const actividadVacia = (id: string): ActividadEnCaptura => ({
  id,
  modo: null,
  concepto: null,
  texto: "",
  busqueda: "",
  horas: "",
});

/** Una actividad sirve si tiene concepto **o** texto. Igual que en la base. */
export const estaCompleta = (a: ActividadEnCaptura): boolean =>
  a.modo === "concepto" ? !!a.concepto : a.texto.trim().length > 0;

interface Props {
  actividad: ActividadEnCaptura;
  numero: number;
  indice: ConceptoBuscable[];
  /** El reparto solo tiene sentido con dos o más actividades (D7). */
  mostrarHoras: boolean;
  sePuedeQuitar: boolean;
  onCambiar: (parcial: Partial<ActividadEnCaptura>) => void;
  onReiniciar: () => void;
  onQuitar: () => void;
  onAbrir: () => void;
  /**
   * "Ya quedó": la tarjeta se compacta y adopta el patrón "cerrado" (D11).
   *
   * Hace falta un gesto explícito porque el cierre al tocar fuera se retiró
   * —peleaba con el teclado, ver `useCierreDiferido`—. Sin él, la última
   * actividad capturada se quedaba con apariencia de abierta para siempre y el
   * lenguaje visual dejaba de significar algo.
   */
  onListo: () => void;
}

/**
 * Tarjeta de actividad — ADR-007 D5.
 *
 * Dos caminos separados por una **"Ó" literal**: concepto del catálogo o
 * actividad escrita. La "ó" visible enseña la regla antes de tocar nada y no
 * cobra un tap extra, que es lo que costaba la alternativa de un selector
 * arriba.
 *
 * Al entrar a un camino, el otro se pliega: queda claro dónde se está
 * escribiendo. El tipo sube al encabezado con **triple redundancia** —palabra,
 * ícono y tono del borde—, para que no dependa de distinguir colores.
 *
 * "cambiar" y no "cancelar": limpia la tarjeta y devuelve los dos caminos.
 * Cambiar de camino **reemplaza** lo anterior; nunca queda un dato escondido
 * que el usuario crea borrado y acabe enviándose.
 */
const TarjetaActividad: React.FC<Props> = ({
  actividad,
  numero,
  indice,
  mostrarHoras,
  sePuedeQuitar,
  onCambiar,
  onReiniciar,
  onQuitar,
  onAbrir,
  onListo,
}) => {

  const { modo, concepto, texto } = actividad;
  const elegido = modo !== null;
  const muestraListo = modo === "escrita" && texto.trim().length > 0;

  return (
    <View
      style={[
        estilos.tarjeta,
        modo === "concepto" && estilos.tarjetaConcepto,
        modo === "escrita" && estilos.tarjetaEscrita,
      ]}
    >
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Actividad {numero}</Text>
        {elegido && (
          <Text
            style={[
              estilos.tipo,
              modo === "concepto" ? estilos.tipoConcepto : estilos.tipoEscrita,
            ]}
          >
            {modo === "concepto" ? "· ⌕ Concepto" : "· ✎ Escrita"}
          </Text>
        )}
        <View style={estilos.espaciador} />
        {elegido && (
          <TouchableOpacity onPress={onReiniciar} hitSlop={8}>
            <Text style={estilos.cambiar}>cambiar</Text>
          </TouchableOpacity>
        )}
        {sePuedeQuitar && (
          // Separador y 12 px de aire respecto a "cambiar": sin eso se toca
          // una creyendo tocar la otra, y una borra la actividad.
          <View style={estilos.quitarCaja}>
            {elegido && <View style={estilos.separador} />}
            <TouchableOpacity onPress={onQuitar} hitSlop={8}>
              <Ionicons
                name="close"
                size={15}
                color={DesignTokens.colors.neutral[400]}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Camino: concepto del catálogo ───────────────────────────── */}
      {modo !== "escrita" &&
        (concepto ? (
          <View>
            <Text style={estilos.rutaElegida} numberOfLines={1}>
              {concepto.ruta}
              {concepto.wbs ? ` · ${concepto.wbs}` : ""}
            </Text>
            <Text style={estilos.descripcionElegida}>
              {concepto.descripcion}
            </Text>
          </View>
        ) : (
          <BuscadorConcepto
            texto={actividad.busqueda}
            onCambiarTexto={(busqueda) =>
              onCambiar({ busqueda, modo: "concepto" })
            }
            onElegir={(elegidoConcepto) => {
              onCambiar({
                concepto: elegidoConcepto,
                modo: "concepto",
                busqueda: "",
              });
              // Elegir un resultado es una acción DEFINITIVA: el usuario tocó
              // el concepto que quería. La tarjeta se cierra sola y el caso
              // dominante no paga ningún tap extra.
              onListo();
            }}
            indice={indice}
            mostrarPista={modo === "concepto"}
            onFocus={() => {
              onAbrir();
              if (modo === null) onCambiar({ modo: "concepto" });
            }}
          />
        ))}

      {/* ── La "Ó", solo mientras no se haya elegido camino ─────────── */}
      {modo === null && (
        <View style={estilos.oFila}>
          <View style={estilos.oLinea} />
          <Text style={estilos.oTexto}>Ó</Text>
          <View style={estilos.oLinea} />
        </View>
      )}

      {/* ── Camino: actividad escrita ───────────────────────────────── */}
      {modo !== "concepto" && (
        <View style={estilos.campoEscrita}>
          <Ionicons
            name="create-outline"
            size={14}
            color={DesignTokens.colors.neutral[500]}
          />
          <BottomSheetTextInput
            style={estilos.entradaEscrita}
            placeholder="Escribe qué hizo la máquina"
            placeholderTextColor={DesignTokens.colors.neutral[400]}
            value={texto}
            onChangeText={(t) => onCambiar({ texto: t, modo: "escrita" })}
            onFocus={() => {
              onAbrir();
              if (modo === null) onCambiar({ modo: "escrita" });
            }}
            multiline
          />
        </View>
      )}

      {/* Pie de la tarjeta: el reparto de horas (D7, desde la segunda
          actividad) a la izquierda y "Listo" a la derecha, en el MISMO
          renglón. Separados ocupaban dos líneas para dos controles pequeños.

          "Listo" solo en el camino escrito: el de concepto no llega aquí
          porque elegir un resultado ya cerró la tarjeta. */}
      {(mostrarHoras || muestraListo) && (
        <View style={estilos.pieTarjeta}>
          {mostrarHoras && (
            <View style={estilos.horasFila}>
              <Text style={estilos.horasEtiqueta}>
                Horas <Text style={estilos.horasOpcional}>· opcional</Text>
              </Text>
              <BottomSheetTextInput
                style={estilos.horasEntrada}
                placeholder="—"
                placeholderTextColor={DesignTokens.colors.neutral[400]}
                value={actividad.horas}
                onChangeText={(h) => onCambiar({ horas: h })}
                onFocus={onAbrir}
                inputMode="decimal"
              />
            </View>
          )}
          {/* Empuja "Listo" a la derecha también cuando no hay horas. */}
          <View style={estilos.empuje} />
          {muestraListo && (
            <TouchableOpacity onPress={onListo} hitSlop={10}>
              <Text style={estilos.listo}>Listo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.md,
    padding: 12,
    marginBottom: 10,
  },
  // Tercera capa de la redundancia del tipo: azul acero / arena. Nunca va
  // sola — la palabra y el ícono dicen lo mismo en el encabezado.
  tarjetaConcepto: { borderColor: "#9FB3CC" },
  tarjetaEscrita: { borderColor: "#D9C79F" },

  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 9,
    minHeight: 20,
  },
  titulo: {
    fontSize: 10.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[600],
  },
  tipo: {
    fontSize: 10.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontWeight: DesignTokens.typography.fontWeight.bold,
  },
  tipoConcepto: { color: "#1E3A5F" },
  tipoEscrita: { color: "#7A5A1D" },
  espaciador: { flex: 1 },
  cambiar: {
    fontSize: 11.5,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[600],
  },
  quitarCaja: { flexDirection: "row", alignItems: "center" },
  separador: {
    width: 1,
    height: 14,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginHorizontal: 12,
  },

  rutaElegida: {
    fontSize: 10.5,
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    marginBottom: 2,
  },
  descripcionElegida: {
    fontSize: 13,
    lineHeight: 18,
    color: DesignTokens.colors.neutral[900],
  },

  oFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 7,
  },
  oLinea: {
    flex: 1,
    height: 1,
    backgroundColor: DesignTokens.colors.neutral[200],
  },
  oTexto: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[400],
  },

  // Geometría COMPARTIDA con el campo de búsqueda de `BuscadorConcepto`: las
  // dos son la misma oferta —concepto ó texto— y el usuario tiene que verlas
  // al mismo tiempo, no una primero por ser más alta. Si cambia una, cambia la
  // otra.
  campoEscrita: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    borderRadius: DesignTokens.borderRadius.base,
    paddingHorizontal: 10,
  },
  entradaEscrita: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    color: DesignTokens.colors.neutral[900],
  },

  pieTarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  empuje: { flex: 1 },
  listo: {
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[600],
  },
  horasFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  horasEtiqueta: {
    fontSize: 11.5,
    color: DesignTokens.colors.neutral[600],
  },
  horasOpcional: { color: DesignTokens.colors.neutral[400] },
  horasEntrada: {
    width: 64,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    borderRadius: DesignTokens.borderRadius.sm,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 12.5,
    textAlign: "right",
    color: DesignTokens.colors.neutral[900],
  },
});

export default TarjetaActividad;

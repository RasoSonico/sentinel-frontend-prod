import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";
import { fechaCorta } from "src/modules/avance/utils/fechaPrograma";

import {
  renglonesMaquinaria,
  totalHorasMaquina,
  SIN_DATO,
  type MaquinariaDelDocumento,
} from "../maquinariaDelDia";

/**
 * El reporte dibujado **como se imprimirá** (ADR-006, Decisión 6).
 *
 * Revisar una lista de campos no es revisar un documento. Mostrar la forma
 * final permite detectar lo que realmente falla en el entregable: un pie que no
 * corresponde, una actividad fuera de orden, evidencia incompleta.
 *
 * **Un componente con dos modos, desde el primer commit.** El paso 4 del wizard
 * y el detalle de consulta de la zona de reportes son literalmente la misma
 * pieza; construir primero uno y "generalizarlo después" es la vía conocida a
 * dos componentes que divergen. En `read` simplemente no se dibujan las
 * affordances de edición.
 */

export type ModoMiniatura = "edit" | "read";

export type BloqueEditable =
  | "participantes"
  | "area"
  | "actividades"
  | "conclusion"
  | "evidencia";

export interface FotoMiniatura {
  id: string;
  /** `localUri` en el wizard, thumbnail por SAS en consulta. */
  uri: string | null;
  pie: string;
  /** La foto todavía no está en el servidor; se marca sin ocultar la imagen. */
  subiendo?: boolean;
}

export interface DatosMiniatura {
  codigo: string;
  /** `YYYY-MM-DD` */
  fecha: string;
  contratistas: string[];
  supervision: string[];
  /** Etiqueta legible del área, no la clave: "Seguridad e Higiene". */
  area: string | null;
  actividades: { texto: string; rotulo: string }[];
  conclusion: string;
  /**
   * La maquinaria que reportó ese día. No se captura aquí: el servidor la
   * copia de la tab de Maquinaria al emitir el reporte, y esta pantalla la
   * enseña porque enseña lo que se va a recibir.
   */
  maquinaria: MaquinariaDelDocumento;
  fotos: FotoMiniatura[];
}

interface Props {
  datos: DatosMiniatura;
  modo: ModoMiniatura;
  /** Solo en `edit`: el ✎ de cada bloque. */
  onEditar?: (bloque: BloqueEditable) => void;
}

export function DocumentoMiniatura({ datos, modo, onEditar }: Props) {
  const editable = modo === "edit" && onEditar !== undefined;

  const editar = (bloque: BloqueEditable) => () => onEditar?.(bloque);

  return (
    <View style={estilos.hoja}>
      <View style={estilos.cajetin}>
        <Text style={estilos.tituloDocumento}>
          Reporte de actividades diario
        </Text>
        <Text style={estilos.codigo}>
          {datos.codigo} · {fechaCorta(datos.fecha)}
        </Text>
      </View>

      <Bloque
        etiqueta="Participantes"
        editable={editable}
        onEditar={editar("participantes")}
      >
        <Text style={estilos.parClave}>
          Contratistas:{" "}
          <Text style={estilos.parValor}>
            {datos.contratistas.join(", ") || "—"}
          </Text>
        </Text>
        <Text style={estilos.parClave}>
          Supervisión:{" "}
          <Text style={estilos.parValor}>
            {datos.supervision.join(", ") || "—"}
          </Text>
        </Text>
      </Bloque>

      {/* Sección propia entre el cajetín y las actividades, igual que en el
          documento impreso: el área no identifica a la obra ni a un
          participante, dice qué especialidad levantó ESTE reporte. */}
      <Bloque etiqueta="Área" editable={editable} onEditar={editar("area")}>
        {datos.area ? (
          <Text style={estilos.parValor}>{datos.area}</Text>
        ) : (
          <Text style={estilos.faltante}>Sin área seleccionada</Text>
        )}
      </Bloque>

      <Bloque
        etiqueta="Actividades supervisadas"
        editable={editable}
        onEditar={editar("actividades")}
      >
        {datos.actividades.length === 0 ? (
          <Text style={estilos.faltante}>Sin actividades capturadas</Text>
        ) : (
          datos.actividades.map((actividad, i) => (
            <View
              key={`${i}-${actividad.texto.slice(0, 12)}`}
              style={estilos.actividadBloque}
            >
              {/* Solo si hay algo que poner: sin esto, las obras que no usan
                  zona ni frente verían un hueco antes de cada renglón. */}
              {actividad.rotulo ? (
                <Text style={estilos.actividadRotulo}>{actividad.rotulo}</Text>
              ) : null}
              <View style={estilos.actividad}>
                <Text style={estilos.actividadNumeral}>{i + 1}.</Text>
                <Text style={estilos.actividadTexto}>{actividad.texto}</Text>
              </View>
            </View>
          ))
        )}
      </Bloque>

      <Bloque
        etiqueta="Observaciones"
        editable={editable}
        onEditar={editar("conclusion")}
      >
        {datos.conclusion.trim().length === 0 ? (
          // Gris y no rojo: dejarla en blanco es una respuesta válida, no un
          // pendiente. El documento simplemente no imprime la sección.
          <Text style={estilos.ausente}>
            Sin observaciones · no se imprimirá esta sección
          </Text>
        ) : (
          <Text style={estilos.parrafo}>{datos.conclusion}</Text>
        )}
      </Bloque>

      {/* Va donde va en el documento: después de las observaciones y antes de
          la evidencia. Y SIN ✎, porque aquí no se captura — se reporta en la
          tab de Maquinaria y el servidor la copia al emitir. */}
      <Bloque etiqueta="Maquinaria del día" editable={false}>
        <TablaMaquinaria maquinaria={datos.maquinaria} />
      </Bloque>

      <Bloque
        etiqueta="Evidencia"
        editable={editable}
        onEditar={editar("evidencia")}
      >
        {datos.fotos.length === 0 ? (
          <Text style={estilos.faltante}>Sin evidencia fotográfica</Text>
        ) : (
          <View style={estilos.rejilla}>
            {datos.fotos.map((foto) => (
              <View key={foto.id} style={estilos.celdaFoto}>
                {foto.uri ? (
                  // Una foto NUNCA retrocede a un hueco: mientras el teléfono
                  // conserve el archivo se pinta ese, y la marca de abajo dice
                  // que todavía va subiendo. Cambiar la imagen por un recuadro
                  // gris se lee como "se borró".
                  <View>
                    <Image source={{ uri: foto.uri }} style={estilos.foto} />
                    {foto.subiendo ? (
                      <View style={estilos.marcaSubiendo}>
                        <Ionicons
                          name="cloud-upload-outline"
                          size={fs(11)}
                          color={DesignTokens.colors.background.primary}
                        />
                        <Text style={estilos.marcaSubiendoTexto}>subiendo</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  // Sin archivo local Y sin miniatura: la foto va subiendo
                  // desde otro dispositivo, o este teléfono ya soltó su copia.
                  <View style={[estilos.foto, estilos.fotoVacia]}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={fs(20)}
                      color={DesignTokens.colors.neutral[400]}
                    />
                  </View>
                )}
                <Text
                  style={[
                    estilos.pieFoto,
                    !foto.pie && estilos.faltante,
                  ]}
                  numberOfLines={2}
                >
                  {foto.pie || "Falta el pie"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Bloque>
    </View>
  );
}

/**
 * La tabla MAQUINARIA DEL DÍA, en dos renglones por máquina.
 *
 * El documento impreso usa cinco columnas —equipo, estado, h. inicial, h.
 * final, horas— y en un teléfono no caben: el equipo se quedaría con setenta
 * puntos y se partiría en cuatro líneas. Así que las mismas cinco se reparten
 * en dos renglones: arriba lo que se busca —qué máquina y cuántas horas—, y
 * abajo el detalle que lo sustenta.
 *
 * No se omite ninguna columna. Esta pantalla sirve para verificar antes de
 * firmar, y verificar contra media tabla no es verificar.
 */
function TablaMaquinaria({
  maquinaria,
}: {
  maquinaria: MaquinariaDelDocumento;
}) {
  const { maquinas, conocida } = maquinaria;

  if (!conocida) {
    // "No me consta" NO se dice como "no hubo". Pasa cuando el teléfono nunca
    // cargó la maquinaria de ese día; el documento la llevará igual, porque la
    // arma el servidor con lo que él tiene.
    return (
      <Text style={estilos.ausente}>
        Este teléfono no tiene la maquinaria de ese día · el documento la
        llevará como la tenga el servidor
      </Text>
    );
  }

  if (maquinas.length === 0) {
    // Gris y no ámbar: el documento simplemente no imprime la sección, igual
    // que con las observaciones. No haber tenido equipo no bloquea nada.
    return (
      <Text style={estilos.ausente}>
        Sin maquinaria reportada · no se imprimirá esta sección
      </Text>
    );
  }

  const renglones = renglonesMaquinaria(maquinas);

  return (
    <View style={estilos.tabla}>
      <View style={estilos.tablaEncabezado}>
        <Text style={[estilos.columnaRotulo, estilos.columnaEquipo]}>
          EQUIPO
        </Text>
        <Text style={[estilos.columnaRotulo, estilos.columnaHoras]}>HORAS</Text>
      </View>

      {renglones.map((renglon, i) => (
        <View key={`${i}-${renglon.equipo}`} style={estilos.maquina}>
          <View style={estilos.maquinaPrincipal}>
            <Text style={estilos.maquinaEquipo}>{renglon.equipo}</Text>
            <Text style={estilos.maquinaHoras}>{renglon.horas}</Text>
          </View>
          <Text style={estilos.maquinaDetalle}>
            {renglon.inicial === SIN_DATO && renglon.final === SIN_DATO
              ? renglon.estado
              : `${renglon.estado} · ${renglon.inicial} → ${renglon.final}`}
          </Text>
        </View>
      ))}

      <View style={estilos.tablaTotal}>
        <Text style={[estilos.columnaRotulo, estilos.columnaEquipo]}>
          TOTAL HORAS-MÁQUINA
        </Text>
        <Text style={estilos.maquinaHoras}>{totalHorasMaquina(maquinas)}</Text>
      </View>

      {/* Dónde se arregla, ya que aquí no se puede. Sin esta línea, encontrar
          un dato mal en la revisión deja al supervisor sin saber a dónde ir.
          En tercera persona porque en consulta el reporte puede ser de otro. */}
      <Text style={estilos.nota}>
        Se copia de lo reportado en Maquinaria ese día.
      </Text>
    </View>
  );
}

function Bloque({
  etiqueta,
  editable,
  onEditar,
  children,
}: {
  etiqueta: string;
  editable: boolean;
  /** Solo cuando `editable`. Los bloques que no se capturan aquí no lo pasan. */
  onEditar?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={estilos.bloque}>
      <View style={estilos.bloqueEncabezado}>
        <Text style={estilos.bloqueEtiqueta}>{etiqueta.toUpperCase()}:</Text>
        {editable && onEditar ? (
          <Pressable
            onPress={onEditar}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${etiqueta}`}
          >
            <Ionicons
              name="create-outline"
              size={fs(18)}
              color={DesignTokens.colors.primary[600]}
            />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  hoja: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.base,
    padding: sp(16),
    gap: sp(16),
    ...DesignTokens.shadows.sm,
  },
  cajetin: {
    alignItems: "center",
    paddingBottom: sp(12),
    borderBottomWidth: 1.5,
    borderBottomColor: DesignTokens.colors.neutral[800],
  },
  tituloDocumento: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    ...sinPaddingAndroid,
  },
  codigo: {
    marginTop: sp(2),
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  bloque: { gap: sp(6) },
  bloqueEncabezado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bloqueEtiqueta: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    letterSpacing: 0.6,
    color: DesignTokens.colors.neutral[700],
    ...sinPaddingAndroid,
  },
  parClave: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  parValor: {
    fontWeight: DesignTokens.typography.fontWeight.normal,
    color: DesignTokens.colors.neutral[800],
  },
  actividadBloque: { gap: sp(2) },
  // Gris en versalitas: el mismo papel que en el papel —decir de qué es lo
  // que sigue— y por eso la misma voz discreta.
  actividadRotulo: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
    letterSpacing: 0.5,
  },
  actividad: { flexDirection: "row", gap: sp(6) },
  actividadNumeral: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  actividadTexto: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.neutral[800],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  parrafo: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.neutral[800],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  // Gris: "no hay" cuando no haber es válido. `faltante` (ámbar) es para lo
  // que sí bloquea el guardado, y confundirlos entrena a ignorar el ámbar.
  ausente: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontStyle: "italic",
    color: DesignTokens.colors.neutral[400],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  faltante: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontStyle: "italic",
    color: DesignTokens.colors.warning[700],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  tabla: { gap: sp(8) },
  tablaEncabezado: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: sp(4),
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  tablaTotal: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingTop: sp(6),
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[300],
  },
  columnaRotulo: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    letterSpacing: 0.6,
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  columnaEquipo: { flex: 1 },
  // Ancho fijo y a la derecha: las horas de todas las máquinas caen en la
  // misma vertical, que es lo que permite leerlas de un vistazo y sumarlas
  // con el ojo contra el total.
  columnaHoras: { width: sp(56), textAlign: "right" },
  maquina: { gap: sp(2) },
  maquinaPrincipal: { flexDirection: "row", alignItems: "baseline" },
  maquinaEquipo: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[800],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  maquinaHoras: {
    width: sp(56),
    textAlign: "right",
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  maquinaDetalle: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.xs)),
    color: DesignTokens.colors.neutral[600],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  nota: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontStyle: "italic",
    color: DesignTokens.colors.neutral[400],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  rejilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: sp(10),
  },
  // Dos columnas, como la rejilla del documento impreso.
  celdaFoto: { width: "47%", gap: sp(4) },
  foto: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: DesignTokens.borderRadius.sm,
    backgroundColor: DesignTokens.colors.neutral[200],
    resizeMode: "cover",
  },
  fotoVacia: { alignItems: "center", justifyContent: "center" },
  marcaSubiendo: {
    position: "absolute",
    right: sp(4),
    bottom: sp(4),
    flexDirection: "row",
    alignItems: "center",
    gap: sp(3),
    paddingHorizontal: sp(5),
    paddingVertical: sp(1),
    borderRadius: DesignTokens.borderRadius.sm,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
  },
  marcaSubiendoTexto: {
    fontSize: fs(10),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.background.primary,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  pieFoto: {
    textAlign: "center",
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.xs)),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});

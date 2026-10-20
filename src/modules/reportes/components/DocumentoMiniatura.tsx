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
}

export interface DatosMiniatura {
  codigo: string;
  /** `YYYY-MM-DD` */
  fecha: string;
  contratistas: string[];
  supervision: string[];
  /** Etiqueta legible del área, no la clave: "Seguridad e Higiene". */
  area: string | null;
  actividades: string[];
  conclusion: string;
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
          datos.actividades.map((texto, i) => (
            <View key={`${i}-${texto.slice(0, 12)}`} style={estilos.actividad}>
              <Text style={estilos.actividadNumeral}>{i + 1}.</Text>
              <Text style={estilos.actividadTexto}>{texto}</Text>
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
                  <Image source={{ uri: foto.uri }} style={estilos.foto} />
                ) : (
                  // Sin miniatura no se pinta un hueco mudo: en consulta
                  // significa que la foto todavía va subiendo.
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

function Bloque({
  etiqueta,
  editable,
  onEditar,
  children,
}: {
  etiqueta: string;
  editable: boolean;
  onEditar: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={estilos.bloque}>
      <View style={estilos.bloqueEncabezado}>
        <Text style={estilos.bloqueEtiqueta}>{etiqueta.toUpperCase()}:</Text>
        {editable ? (
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
  pieFoto: {
    textAlign: "center",
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.xs)),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});

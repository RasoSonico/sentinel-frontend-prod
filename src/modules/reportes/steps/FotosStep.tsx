import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { MAX_FOTOS } from "../constantes";
import type { FotoBorrador } from "../state/BorradorReporteContext";
import { useBorradorReporte } from "../state/BorradorReporteContext";

/**
 * Paso 2 · Fotos (ADR-006, Decisión 4).
 *
 * **0–6 fotos, opcionales; pie obligatorio por foto.** El pie es obligatorio
 * porque una foto sin descripción no es evidencia: el cliente la recibe sin
 * saber qué está viendo. Pero la foto **nunca se descarta** por no tenerlo —
 * destruir trabajo del usuario para forzar una regla de formato es
 * desproporcionado. El bloqueo vive en el botón de guardar.
 *
 * **Los dos orígenes son bloques permanentes**, no un FAB ni un menú: en campo
 * el usuario alterna entre tomar foto y elegir de galería, y ambos deben estar
 * a un toque sin descubrimiento.
 *
 * Este paso es PRESENTACIONAL: la captura vive en `useCapturaFotosReporte`, un
 * nivel arriba, porque el carrusel también agrega fotos y necesita las mismas
 * acciones.
 */

interface Props {
  onTomarFoto: () => void;
  onElegirDeGaleria: () => void;
  onAbrirDetalle: (fotoId: string) => void;
  cargando: boolean;
  restantes: number;
  lleno: boolean;
}

export function FotosStep({
  onTomarFoto,
  onElegirDeGaleria,
  onAbrirDetalle,
  cargando,
  restantes,
  lleno,
}: Props) {
  const { borrador } = useBorradorReporte();
  const { fotos } = borrador;

  const renderFila = useCallback(
    ({ item, index }: { item: FotoBorrador; index: number }) => (
      <Pressable
        onPress={() => onAbrirDetalle(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Fotografía ${index + 1}: ${item.pie || "sin pie"}`}
        style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
      >
        <Image source={{ uri: item.localUri }} style={estilos.miniatura} />
        <View style={estilos.filaTexto}>
          <Text
            style={[estilos.pie, !item.pie && estilos.pieFaltante]}
            numberOfLines={2}
          >
            {item.pie || "Falta el pie de foto"}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={fs(18)}
          color={DesignTokens.colors.neutral[400]}
        />
      </Pressable>
    ),
    [onAbrirDetalle],
  );

  return (
    <FlatList
      data={fotos}
      keyExtractor={(item) => item.id}
      renderItem={renderFila}
      contentContainerStyle={estilos.lista}
      ListHeaderComponent={
        <>
          <Text style={estilos.instruccion}>
            Agrega tus fotografías con pie de foto. Máximo {MAX_FOTOS}.
          </Text>
          <View style={estilos.encabezado}>
            <Text style={estilos.etiquetaGrupo}>Fotos del reporte</Text>
            <Text style={estilos.contador}>
              {fotos.length} de {MAX_FOTOS}
            </Text>
          </View>
        </>
      }
      ListFooterComponent={
        <View style={estilos.zonaAgregar}>
          <Text style={estilos.etiquetaGrupo}>Agregar fotos</Text>
          <View style={estilos.origenes}>
            <BloqueOrigen
              icono="camera-outline"
              etiqueta="Cámara"
              onPress={onTomarFoto}
              deshabilitado={lleno || cargando}
            />
            <BloqueOrigen
              icono="images-outline"
              etiqueta="Galería"
              onPress={onElegirDeGaleria}
              deshabilitado={lleno || cargando}
            />
          </View>
          {lleno ? (
            <Text style={estilos.aviso}>Máximo alcanzado</Text>
          ) : (
            <Text style={estilos.aviso}>
              {restantes === 1
                ? "Queda 1 espacio"
                : `Quedan ${restantes} espacios`}
            </Text>
          )}
          {cargando ? (
            <ActivityIndicator
              style={estilos.cargando}
              color={DesignTokens.colors.primary[500]}
            />
          ) : null}
        </View>
      }
    />
  );
}

function BloqueOrigen({
  icono,
  etiqueta,
  onPress,
  deshabilitado,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  etiqueta: string;
  onPress: () => void;
  deshabilitado: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      style={({ pressed }) => [
        estilos.origen,
        deshabilitado && estilos.origenInactivo,
        pressed && !deshabilitado && estilos.presionada,
      ]}
    >
      <Ionicons
        name={icono}
        size={fs(26)}
        color={
          deshabilitado
            ? DesignTokens.colors.neutral[400]
            : DesignTokens.colors.primary[600]
        }
      />
      <Text
        style={[
          estilos.origenTexto,
          deshabilitado && estilos.origenTextoInactivo,
        ]}
      >
        {etiqueta}
      </Text>
    </Pressable>
  );
}

const MINIATURA = 62;

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  lista: { padding: sp(16), paddingBottom: sp(24) },
  instruccion: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.neutral[600],
    marginBottom: sp(16),
    ...sinPaddingAndroid,
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: sp(10),
  },
  etiquetaGrupo: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  contador: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[600],
    ...sinPaddingAndroid,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(12),
    padding: sp(8),
    marginBottom: sp(8),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    ...DesignTokens.shadows.sm,
  },
  presionada: { opacity: 0.85 },
  miniatura: {
    width: sp(MINIATURA),
    height: sp(MINIATURA),
    borderRadius: DesignTokens.borderRadius.sm,
    backgroundColor: DesignTokens.colors.neutral[200],
  },
  filaTexto: { flex: 1 },
  pie: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.base)),
    color: DesignTokens.colors.neutral[800],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  pieFaltante: {
    color: DesignTokens.colors.warning[700],
    fontStyle: "italic",
  },
  zonaAgregar: { marginTop: sp(16), gap: sp(10) },
  origenes: { flexDirection: "row", gap: sp(12) },
  origen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: sp(6),
    paddingVertical: sp(18),
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: DesignTokens.colors.primary[300],
    backgroundColor: DesignTokens.colors.primary[50],
  },
  origenInactivo: {
    borderColor: DesignTokens.colors.neutral[300],
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  origenTexto: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[700],
    ...sinPaddingAndroid,
  },
  origenTextoInactivo: { color: DesignTokens.colors.neutral[500] },
  aviso: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  cargando: { marginTop: sp(8) },
});

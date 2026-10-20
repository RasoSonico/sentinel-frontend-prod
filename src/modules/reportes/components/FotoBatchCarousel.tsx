import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DesignTokens } from "src/styles/designTokens";
import { fs, sp } from "src/styles/escala";
import { AnchoredMenu, medirYAbrir } from "src/components/common/AnchoredMenu";

import { MAX_CARACTERES_PIE, MAX_FOTOS } from "../constantes";
import { useBorradorReporte } from "../state/BorradorReporteContext";

/**
 * Carrusel de la tanda recién elegida (ADR-006, Decisión 4).
 *
 * **Existe porque la galería devuelve tandas.** Sin él, elegir seis fotos
 * obligaría a seis viajes a un detalle individual. Los chips numerados
 * convierten la corrección de una foto puntual en un toque.
 *
 * **Nada se descarta por falta de pie.** El botón de guardar espera a que la
 * tanda esté completa y la franja ámbar lleva directo a la que falta; el ✕
 * confirma descartar la tanda entera, que es una decisión explícita del
 * usuario, no un castigo por no haber escrito todavía.
 */

interface Props {
  /** Ids de las fotos de esta tanda, en orden. */
  ids: string[];
  onListo: () => void;
  /** Abre cámara o galería para sumar otra foto a la tanda. */
  onAgregarOtra: (origen: "camara" | "galeria") => void;
}

export function FotoBatchCarousel({ ids, onListo, onAgregarOtra }: Props) {
  const insets = useSafeAreaInsets();
  const { borrador, setPieDeFoto, eliminarFoto } = useBorradorReporte();
  const [indice, setIndice] = useState(0);
  const botonRef = useRef<View>(null);

  const tanda = useMemo(
    () =>
      ids
        .map((id) => borrador.fotos.find((f) => f.id === id))
        .filter((f): f is NonNullable<typeof f> => f !== undefined),
    [ids, borrador.fotos],
  );

  const actual = tanda[Math.min(indice, tanda.length - 1)];
  const sinPie = tanda.findIndex((f) => f.pie.trim().length === 0);
  const completa = sinPie === -1 && tanda.length > 0;
  const esUltima = indice >= tanda.length - 1;
  const restantes = MAX_FOTOS - borrador.fotos.length;

  const descartarTanda = useCallback(() => {
    Alert.alert(
      "Descartar estas fotografías",
      `Se quitarán ${tanda.length === 1 ? "la fotografía" : `las ${tanda.length} fotografías`} que acabas de agregar.`,
      [
        { text: "Seguir aquí", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => {
            tanda.forEach((f) => eliminarFoto(f.id));
            onListo();
          },
        },
      ],
    );
  }, [tanda, eliminarFoto, onListo]);

  const descartarActual = useCallback(() => {
    if (!actual) return;
    eliminarFoto(actual.id);
    if (tanda.length <= 1) onListo();
    else setIndice((i) => Math.max(0, Math.min(i, tanda.length - 2)));
  }, [actual, eliminarFoto, tanda.length, onListo]);

  if (!actual) return null;

  return (
    <KeyboardAvoidingView
      style={estilos.raiz}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[estilos.header, { paddingTop: insets.top + sp(8) }]}>
        <Pressable
          onPress={descartarTanda}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Descartar las fotografías de esta tanda"
          style={estilos.iconoHeader}
        >
          <Ionicons
            name="close"
            size={fs(24)}
            color={DesignTokens.colors.background.primary}
          />
        </Pressable>
        <Text style={estilos.tituloHeader}>Pies de foto</Text>
        <Pressable
          onPress={onListo}
          disabled={!completa}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Guardar los pies de foto"
          accessibilityState={{ disabled: !completa }}
        >
          <Text style={[estilos.guardar, !completa && estilos.inactivo]}>
            Guardar
          </Text>
        </Pressable>
      </View>

      {!completa ? (
        <Pressable
          onPress={() => setIndice(sinPie)}
          accessibilityRole="button"
          style={estilos.franjaAmbar}
        >
          <Ionicons
            name="alert-circle-outline"
            size={fs(16)}
            color={DesignTokens.colors.warning[800]}
          />
          <Text style={estilos.textoAmbar}>
            Falta el pie de la foto {sinPie + 1}
          </Text>
          <Text style={estilos.irAmbar}>Ir ›</Text>
        </Pressable>
      ) : null}

      <ScrollView
        contentContainerStyle={estilos.cuerpo}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.barraSuperior}>
          <Text style={estilos.contador}>
            Foto {indice + 1} de {tanda.length}
          </Text>
          <Pressable onPress={descartarActual} hitSlop={8}>
            <Text style={estilos.descartar}>Descartar esta foto</Text>
          </Pressable>
        </View>

        <View style={estilos.chips}>
          {tanda.map((foto, i) => (
            <Pressable
              key={foto.id}
              onPress={() => setIndice(i)}
              accessibilityRole="button"
              accessibilityLabel={`Ir a la foto ${i + 1}`}
              style={[
                estilos.chip,
                foto.pie.trim().length > 0 && estilos.chipConPie,
                i === indice && estilos.chipActual,
              ]}
            >
              <Text
                style={[
                  estilos.chipTexto,
                  foto.pie.trim().length > 0 && estilos.chipTextoConPie,
                ]}
              >
                {i + 1}
              </Text>
            </Pressable>
          ))}
        </View>

        <Image source={{ uri: actual.localUri }} style={estilos.imagen} />

        <View style={estilos.bloquePie}>
          <View style={estilos.etiquetaFila}>
            <Text style={estilos.etiqueta}>Pie de foto · obligatorio</Text>
            <Text
              style={[
                estilos.conteo,
                actual.pie.length >= MAX_CARACTERES_PIE && estilos.conteoTope,
              ]}
            >
              {actual.pie.length} / {MAX_CARACTERES_PIE}
            </Text>
          </View>
          <TextInput
            value={actual.pie}
            onChangeText={(texto) => setPieDeFoto(actual.id, texto)}
            // Tope DURO, no un aviso: el límite viene del ancho impreso del
            // bloque de foto. Con contador visible, el usuario ve el borde
            // mientras escribe en vez de descubrir el corte en el PDF.
            maxLength={MAX_CARACTERES_PIE}
            placeholder="Personal con arnés y línea de vida"
            placeholderTextColor={DesignTokens.colors.neutral[400]}
            style={estilos.input}
          />
        </View>
      </ScrollView>

      <View
        style={[
          estilos.pie,
          { paddingBottom: Math.max(insets.bottom, sp(12)) },
        ]}
      >
        <Pressable
          onPress={() => setIndice((i) => Math.max(0, i - 1))}
          disabled={indice === 0}
          style={({ pressed }) => [
            estilos.navegar,
            indice === 0 && estilos.navegarInactivo,
            pressed && indice > 0 && estilos.presionado,
          ]}
        >
          <Text
            style={[
              estilos.navegarTexto,
              indice === 0 && estilos.navegarTextoInactivo,
            ]}
          >
            ← Anterior
          </Text>
        </Pressable>

        {esUltima ? (
          <AnchoredMenu
            opciones={[
              {
                clave: "camara",
                etiqueta: "Cámara",
                icono: "camera-outline",
                onPress: () => onAgregarOtra("camara"),
                deshabilitada: restantes <= 0,
              },
              {
                clave: "galeria",
                etiqueta: "Galería",
                icono: "images-outline",
                onPress: () => onAgregarOtra("galeria"),
                deshabilitada: restantes <= 0,
              },
            ]}
            // El cupo solo se dice cuando empieza a escasear: anunciarlo desde
            // la primera foto sería ruido.
            nota={
              restantes <= 2
                ? restantes <= 0
                  ? "Máximo alcanzado"
                  : `Quedan ${restantes}`
                : undefined
            }
          >
            {(abrir) => (
              <View ref={botonRef} style={estilos.navegarContenedor}>
                <Pressable
                  onPress={() => medirYAbrir(botonRef, abrir)}
                  style={({ pressed }) => [
                    estilos.navegar,
                    estilos.agregar,
                    pressed && estilos.presionado,
                  ]}
                >
                  <Text style={estilos.agregarTexto}>＋ Agregar otra</Text>
                </Pressable>
              </View>
            )}
          </AnchoredMenu>
        ) : (
          <Pressable
            onPress={() => setIndice((i) => Math.min(tanda.length - 1, i + 1))}
            style={({ pressed }) => [
              estilos.navegar,
              pressed && estilos.presionado,
            ]}
          >
            <Text style={estilos.navegarTexto}>Siguiente foto →</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: DesignTokens.colors.background.secondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sp(16),
    paddingBottom: sp(12),
    backgroundColor: DesignTokens.colors.executive.primary,
  },
  iconoHeader: {
    width: fs(32),
    height: fs(32),
    alignItems: "center",
    justifyContent: "center",
  },
  tituloHeader: {
    flex: 1,
    textAlign: "center",
    color: DesignTokens.colors.background.primary,
    fontSize: fs(DesignTokens.typography.fontSize.lg),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    ...sinPaddingAndroid,
  },
  guardar: {
    color: DesignTokens.colors.background.primary,
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    ...sinPaddingAndroid,
  },
  inactivo: { color: DesignTokens.colors.neutral[500] },
  franjaAmbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(8),
    paddingHorizontal: sp(16),
    paddingVertical: sp(10),
    backgroundColor: DesignTokens.colors.warning[100],
  },
  textoAmbar: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.warning[800],
    ...sinPaddingAndroid,
  },
  irAmbar: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.warning[800],
    ...sinPaddingAndroid,
  },
  cuerpo: { padding: sp(16), gap: sp(12) },
  barraSuperior: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contador: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
    ...sinPaddingAndroid,
  },
  descartar: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.error[600],
    ...sinPaddingAndroid,
  },
  chips: { flexDirection: "row", gap: sp(8), flexWrap: "wrap" },
  chip: {
    width: sp(32),
    height: sp(32),
    borderRadius: sp(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DesignTokens.colors.neutral[200],
    borderWidth: 2,
    borderColor: "transparent",
  },
  chipConPie: { backgroundColor: DesignTokens.colors.primary[500] },
  chipActual: { borderColor: DesignTokens.colors.executive.primary },
  chipTexto: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[600],
    ...sinPaddingAndroid,
  },
  chipTextoConPie: { color: DesignTokens.colors.background.primary },
  imagen: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.neutral[200],
    resizeMode: "cover",
  },
  bloquePie: { gap: sp(6) },
  etiquetaFila: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  etiqueta: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  conteo: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  conteoTope: {
    color: DesignTokens.colors.warning[700],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  input: {
    minHeight: sp(48),
    paddingHorizontal: sp(14),
    paddingVertical: sp(10),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    fontSize: fs(DesignTokens.typography.fontSize.base),
    color: DesignTokens.colors.neutral[900],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  pie: {
    flexDirection: "row",
    gap: sp(12),
    paddingHorizontal: sp(16),
    paddingTop: sp(12),
    backgroundColor: DesignTokens.colors.background.primary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  // `flexDirection: "row"` no es decorativo: sin él este envoltorio es una
  // columna, y el `flex: 1` de `navegar` (base 0) hace que reserve cero alto
  // y el botón se dibuje desbordado hacia abajo — cortado a la mitad. En fila,
  // el hijo crece a lo ancho y el envoltorio toma su alto real.
  navegarContenedor: { flex: 1, flexDirection: "row" },
  navegar: {
    flex: 1,
    minHeight: sp(48),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: sp(12),
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1.5,
    borderColor: DesignTokens.colors.executive.primary,
  },
  navegarInactivo: { borderColor: DesignTokens.colors.neutral[300] },
  navegarTexto: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.executive.primary,
    ...sinPaddingAndroid,
  },
  navegarTextoInactivo: { color: DesignTokens.colors.neutral[400] },
  agregar: {
    borderColor: DesignTokens.colors.primary[500],
    backgroundColor: DesignTokens.colors.primary[50],
  },
  agregarTexto: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[700],
    ...sinPaddingAndroid,
  },
  presionado: { opacity: 0.85 },
});

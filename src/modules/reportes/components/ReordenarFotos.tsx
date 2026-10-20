import React, { useCallback, useState } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

import type { FotoBorrador } from "../state/BorradorReporteContext";

/**
 * Modo ordenar de la rejilla de evidencia (ADR-006, Decisión 6).
 *
 * **Es un MODO, no un gesto siempre activo.** En una pantalla de verificación
 * un arrastre accidental sería especialmente costoso: el usuario está leyendo
 * para detectar errores, no manipulando. Se entra con "⇅ Ordenar" y se sale con
 * "Listo".
 *
 * **El pie viaja pegado a su foto**: se reordena la foto completa, nunca la
 * imagen por un lado y el texto por otro.
 *
 * El arrastre solo mueve la fila tomada y marca con una línea dónde va a caer.
 * Se descartó animar el desplazamiento del resto: costaría el doble de código
 * en un modo que se usa unos segundos, y una línea de destino comunica lo mismo
 * sin margen de error.
 */

const ALTO_FILA = 74;

interface Props {
  fotos: FotoBorrador[];
  onReordenar: (ids: string[]) => void;
}

export function ReordenarFotos({ fotos, onReordenar }: Props) {
  const [destino, setDestino] = useState<number | null>(null);

  const mover = useCallback(
    (desde: number, hasta: number) => {
      setDestino(null);
      if (desde === hasta) return;
      const copia = [...fotos];
      const [movida] = copia.splice(desde, 1);
      copia.splice(hasta, 0, movida);
      onReordenar(copia.map((f) => f.id));
    },
    [fotos, onReordenar],
  );

  return (
    <View style={estilos.lista}>
      {fotos.map((foto, indice) => (
        <FilaOrdenable
          key={foto.id}
          foto={foto}
          indice={indice}
          total={fotos.length}
          onSoltar={mover}
          onArrastrar={setDestino}
          esDestino={destino === indice}
        />
      ))}
    </View>
  );
}

function FilaOrdenable({
  foto,
  indice,
  total,
  onSoltar,
  onArrastrar,
  esDestino,
}: {
  foto: FotoBorrador;
  indice: number;
  total: number;
  onSoltar: (desde: number, hasta: number) => void;
  onArrastrar: (destino: number | null) => void;
  esDestino: boolean;
}) {
  const desplazamiento = useSharedValue(0);
  const arrastrando = useSharedValue(false);

  const gesto = Gesture.Pan()
    // Se activa desde el asa, no desde toda la fila: así el usuario todavía
    // puede desplazar la lista con el dedo sobre el contenido.
    .activateAfterLongPress(120)
    .onStart(() => {
      arrastrando.value = true;
    })
    .onUpdate((evento) => {
      desplazamiento.value = evento.translationY;
      const salto = Math.round(evento.translationY / sp(ALTO_FILA));
      const objetivo = Math.max(0, Math.min(total - 1, indice + salto));
      runOnJS(onArrastrar)(objetivo);
    })
    .onEnd((evento) => {
      const salto = Math.round(evento.translationY / sp(ALTO_FILA));
      const objetivo = Math.max(0, Math.min(total - 1, indice + salto));
      desplazamiento.value = 0;
      arrastrando.value = false;
      runOnJS(onSoltar)(indice, objetivo);
    })
    .onFinalize(() => {
      desplazamiento.value = 0;
      arrastrando.value = false;
      runOnJS(onArrastrar)(null);
    });

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ translateY: desplazamiento.value }],
    zIndex: arrastrando.value ? 10 : 0,
    opacity: arrastrando.value ? 0.95 : 1,
  }));

  return (
    <GestureDetector gesture={gesto}>
      <Animated.View
        style={[estilos.fila, esDestino && estilos.filaDestino, estiloAnimado]}
      >
        <Ionicons
          name="reorder-three"
          size={fs(24)}
          color={DesignTokens.colors.neutral[400]}
        />
        <Image source={{ uri: foto.localUri }} style={estilos.miniatura} />
        <Text style={estilos.pie} numberOfLines={2}>
          {foto.pie || "Sin pie de foto"}
        </Text>
        <Text style={estilos.posicion}>{indice + 1}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: sp(8) },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(10),
    height: sp(ALTO_FILA),
    paddingHorizontal: sp(10),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    ...DesignTokens.shadows.sm,
  },
  filaDestino: {
    borderWidth: 2,
    borderColor: DesignTokens.colors.primary[500],
  },
  miniatura: {
    width: sp(52),
    height: sp(52),
    borderRadius: DesignTokens.borderRadius.sm,
    backgroundColor: DesignTokens.colors.neutral[200],
  },
  pie: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.neutral[800],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  posicion: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[400],
    ...(Platform.OS === "android"
      ? { includeFontPadding: false, textAlignVertical: "center" as const }
      : {}),
  },
});

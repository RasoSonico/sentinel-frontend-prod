import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

/**
 * Menú anclado a un botón (ADR-006, D10.5).
 *
 * **Componente propio y no menú contextual nativo.** iOS y Android los dibujan
 * distinto, y con el nativo se perderían las dos cosas que aquí importan: que
 * el menú tenga exactamente el ancho del botón que lo abrió, y la punta que lo
 * conecta visualmente con él. Un menú que aparece flotando sin relación con su
 * origen obliga al usuario a reconstruir de dónde salió.
 *
 * Se abre HACIA ARRIBA porque su caso de uso vive al pie de la pantalla, donde
 * un menú hacia abajo quedaría fuera de la ventana.
 */

export interface OpcionMenu {
  clave: string;
  etiqueta: string;
  icono: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  deshabilitada?: boolean;
}

interface Props {
  opciones: OpcionMenu[];
  /** Texto pequeño bajo las opciones, p. ej. el cupo restante. */
  nota?: string;
  children: (abrir: (medidas: LayoutRectangle) => void) => React.ReactNode;
}

const MARGEN_PANTALLA = 8;

export function AnchoredMenu({ opciones, nota, children }: Props) {
  const [ancla, setAncla] = useState<LayoutRectangle | null>(null);
  // El alto medido va en estado y no en una ref: leerlo durante el render —que
  // es justo cuando hace falta para colocar el menú— es lo que la regla de
  // refs prohíbe, y con razón: una ref no vuelve a renderizar, así que la
  // primera apertura se pintaría con el alto de la anterior.
  const [alturaMedida, setAlturaMedida] = useState(0);

  const abrir = useCallback((medidas: LayoutRectangle) => {
    setAncla(medidas);
  }, []);

  const cerrar = useCallback(() => setAncla(null), []);

  const { height: altoPantalla } = Dimensions.get("window");
  const alturaEstimada =
    opciones.length * sp(52) + (nota ? sp(28) : 0) + sp(16);
  const alturaMenu = alturaMedida || alturaEstimada;

  // Hacia arriba, con la punta pegada al borde superior del botón.
  const topSinTopar = (ancla?.y ?? 0) - alturaMenu - sp(8);
  const top = Math.max(MARGEN_PANTALLA, Math.min(topSinTopar, altoPantalla));

  return (
    <>
      {children(abrir)}

      <Modal
        visible={ancla !== null}
        transparent
        animationType="fade"
        onRequestClose={cerrar}
      >
        {/* Toda la pantalla cierra el menú: es el gesto que la gente ya
            espera de un menú flotante. */}
        <Pressable style={estilos.telon} onPress={cerrar} />

        {ancla ? (
          <View
            onLayout={(evento) => {
              const alto = evento.nativeEvent.layout.height;
              setAlturaMedida((previa) => (previa === alto ? previa : alto));
            }}
            style={[
              estilos.menu,
              { top, left: ancla.x, width: ancla.width },
            ]}
          >
            {opciones.map((opcion, indice) => (
              <Pressable
                key={opcion.clave}
                onPress={() => {
                  cerrar();
                  opcion.onPress();
                }}
                disabled={opcion.deshabilitada}
                accessibilityRole="button"
                accessibilityLabel={opcion.etiqueta}
                accessibilityState={{ disabled: opcion.deshabilitada }}
                style={({ pressed }) => [
                  estilos.opcion,
                  indice > 0 && estilos.opcionSeparada,
                  pressed && !opcion.deshabilitada && estilos.presionada,
                ]}
              >
                <Ionicons
                  name={opcion.icono}
                  size={fs(20)}
                  color={
                    opcion.deshabilitada
                      ? DesignTokens.colors.neutral[400]
                      : DesignTokens.colors.executive.primary
                  }
                />
                <Text
                  style={[
                    estilos.etiqueta,
                    opcion.deshabilitada && estilos.etiquetaInactiva,
                  ]}
                >
                  {opcion.etiqueta}
                </Text>
              </Pressable>
            ))}

            {nota ? <Text style={estilos.nota}>{nota}</Text> : null}

            {/* La punta que ata el menú a su botón. */}
            <View style={estilos.punta} />
          </View>
        ) : null}
      </Modal>
    </>
  );
}

/**
 * Mide un botón y abre el menú sobre él.
 *
 * **Oculta el teclado antes de medir.** Con el teclado abierto la vista está
 * desplazada y `measureInWindow` devuelve una posición que deja de ser válida
 * en cuanto el teclado se cierra — el menú aparecería despegado de su botón.
 */
export function medirYAbrir(
  ref: React.RefObject<View | null>,
  abrir: (medidas: LayoutRectangle) => void,
) {
  Keyboard.dismiss();
  requestAnimationFrame(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      abrir({ x, y, width, height });
    });
  });
}

const estilos = StyleSheet.create({
  telon: { ...StyleSheet.absoluteFillObject },
  menu: {
    position: "absolute",
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: DesignTokens.colors.background.primary,
    paddingVertical: sp(6),
    ...DesignTokens.shadows.lg,
  },
  opcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(12),
    minHeight: sp(48),
    paddingHorizontal: sp(16),
  },
  opcionSeparada: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  presionada: { backgroundColor: DesignTokens.colors.neutral[100] },
  etiqueta: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.base), 1.2),
    color: DesignTokens.colors.neutral[800],
    fontWeight: DesignTokens.typography.fontWeight.medium,
    ...(Platform.OS === "android"
      ? { includeFontPadding: false, textAlignVertical: "center" as const }
      : {}),
  },
  etiquetaInactiva: { color: DesignTokens.colors.neutral[400] },
  nota: {
    paddingHorizontal: sp(16),
    paddingTop: sp(6),
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  punta: {
    position: "absolute",
    bottom: -sp(7),
    left: "50%",
    marginLeft: -sp(8),
    width: 0,
    height: 0,
    borderLeftWidth: sp(8),
    borderRightWidth: sp(8),
    borderTopWidth: sp(8),
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: DesignTokens.colors.background.primary,
  },
});

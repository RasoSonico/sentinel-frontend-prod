/**
 * La captura de la firma, a pantalla completa.
 *
 * **Pantalla completa y no una hoja inferior, a propósito.** Un
 * `@gorhom/bottom-sheet` compite por el mismo gesto vertical que el trazo y se
 * lo lleva: el usuario intenta firmar y lo que hace es arrastrar la hoja. Es
 * el equivalente en React Native del `touch-action: none` que hace falta en la
 * web, y es el error número uno al montar un lienzo de firma.
 *
 * Se usa desde dos sitios con el mismo componente:
 *
 * - **El perfil**, para dar de alta la firma una vez.
 * - **El cierre de un documento**, cuando la persona no la tiene dada de alta
 *   y la traza en el momento. Ahí aparece además la opción de guardarla, que
 *   es lo que la convierte en "ya no la vuelvo a dibujar".
 *
 * Dibujar una firma para un documento **no** la da de alta por su cuenta: si
 * la quiere guardada, lo dice con la casilla. Guardar una firma en el perfil
 * de alguien sin que lo pida es tomar una decisión que no es nuestra.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Checkbox } from 'react-native-paper';

import { DesignTokens } from 'src/styles/designTokens';
import LienzoFirma, { LienzoFirmaRef } from './LienzoFirma';
import { Geometria, problemaDe } from './trazo';

interface Props {
  visible: boolean;
  /** Rótulo del botón que confirma. El verbo cambia con el sitio. */
  textoConfirmar?: string;
  /** Muestra la casilla de "guardar en mi perfil". */
  ofrecerGuardar?: boolean;
  onCancelar: () => void;
  onConfirmar: (geometria: Geometria, guardarEnPerfil: boolean) => void;
}

const PantallaFirma: React.FC<Props> = ({
  visible,
  textoConfirmar = 'Usar esta firma',
  ofrecerGuardar = false,
  onCancelar,
  onConfirmar,
}) => {
  const lienzo = useRef<LienzoFirmaRef>(null);
  const [hayTrazo, setHayTrazo] = useState(false);
  const [guardar, setGuardar] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limpiar = useCallback(() => {
    lienzo.current?.limpiar();
    setError(null);
  }, []);

  const confirmar = useCallback(() => {
    const geometria = lienzo.current?.leer();
    if (!geometria) {
      setError('Traza tu firma para continuar.');
      return;
    }
    // Se revisa contra las mismas cotas del servidor antes de mandar: el 400
    // llegaría al cerrar el reporte, que es el peor momento para enterarse.
    const problema = problemaDe(geometria);
    if (problema) {
      setError(problema.mensaje);
      return;
    }
    setError(null);
    onConfirmar(geometria, ofrecerGuardar && guardar);
  }, [guardar, ofrecerGuardar, onConfirmar]);

  const cerrar = useCallback(() => {
    limpiar();
    setHayTrazo(false);
    onCancelar();
  }, [limpiar, onCancelar]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={cerrar}
    >
      {/* Hace falta aquí dentro: un `Modal` de React Native monta su propia
          jerarquía de vistas, fuera del root de gesture-handler de la app. Sin
          esto el lienzo no recibe un solo gesto en Android. */}
      <GestureHandlerRootView style={styles.raiz}>
        <SafeAreaView style={styles.raiz}>
          <View style={styles.barra}>
            <TouchableOpacity onPress={cerrar} hitSlop={12}>
              <Ionicons
                name="close"
                size={26}
                color={DesignTokens.colors.neutral[600]}
              />
            </TouchableOpacity>
            <Text style={styles.titulo}>Tu firma</Text>
            <TouchableOpacity onPress={limpiar} hitSlop={12} disabled={!hayTrazo}>
              <Text
                style={[styles.limpiar, !hayTrazo && styles.limpiarApagado]}
              >
                Borrar
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cuerpo}>
            <View style={styles.marco}>
              {/* La raya va PRIMERO para que quede detrás del trazo. Un
                  zIndex negativo funcionaría en iOS y no siempre en Android;
                  el orden del árbol funciona en los dos. */}
              <View style={styles.raya} />
              <LienzoFirma
                ref={lienzo}
                alto={260}
                onHayTrazo={(hay) => {
                  setHayTrazo(hay);
                  if (hay) setError(null);
                }}
              />
            </View>

            <Text style={styles.ayuda}>
              Firma con el dedo sobre la línea, como lo harías en papel.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {ofrecerGuardar ? (
              <TouchableOpacity
                style={styles.casilla}
                onPress={() => setGuardar((v) => !v)}
                activeOpacity={0.7}
              >
                <Checkbox
                  status={guardar ? 'checked' : 'unchecked'}
                  onPress={() => setGuardar((v) => !v)}
                  color={DesignTokens.colors.primary[600]}
                />
                <Text style={styles.casillaTexto}>
                  Guardar en mi perfil para no volver a dibujarla
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.pie}>
            <TouchableOpacity
              style={[styles.boton, !hayTrazo && styles.botonApagado]}
              onPress={confirmar}
              disabled={!hayTrazo}
              activeOpacity={0.85}
            >
              <Text style={styles.botonTexto}>
                {hayTrazo ? textoConfirmar : 'Traza tu firma para continuar'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: DesignTokens.colors.background.primary },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingVertical: DesignTokens.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  titulo: {
    fontSize: DesignTokens.typography.fontSize.lg,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.executive.primary,
  },
  limpiar: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.primary[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  limpiarApagado: { color: DesignTokens.colors.neutral[300] },
  cuerpo: { flex: 1, padding: DesignTokens.spacing.lg },
  marco: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: DesignTokens.colors.background.primary,
    overflow: 'hidden',
  },
  raya: {
    position: 'absolute',
    left: DesignTokens.spacing['2xl'],
    right: DesignTokens.spacing['2xl'],
    bottom: DesignTokens.spacing['2xl'],
    height: 1,
    backgroundColor: DesignTokens.colors.neutral[300],
  },
  ayuda: {
    marginTop: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    textAlign: 'center',
  },
  error: {
    marginTop: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.error[600],
    textAlign: 'center',
  },
  casilla: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DesignTokens.spacing.xl,
  },
  casillaTexto: {
    flex: 1,
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.executive.secondary,
  },
  pie: {
    padding: DesignTokens.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  boton: {
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.md,
    paddingVertical: DesignTokens.spacing.lg,
    alignItems: 'center',
  },
  botonApagado: { backgroundColor: DesignTokens.colors.neutral[300] },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
});

export default PantallaFirma;

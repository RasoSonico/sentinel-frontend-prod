/**
 * "Mi firma": la pantalla a la que lleva la fila del menú de Perfil.
 *
 * Es donde se da de alta una vez. Sin ella, firmar sería dibujar en cada
 * reporte; con ella se dibuja una vez y el sistema la inserta sola en todo lo
 * que la requiera.
 *
 * **Dos modos, nunca dos hojas encimadas.** El detalle y el lienzo son
 * `Modal`s distintos pero se excluyen: solo uno está visible a la vez. Anidar
 * un `Modal` dentro de otro funciona casi siempre y falla justo en iOS, al
 * presentar el segundo mientras el primero todavía se está animando.
 *
 * **Quitarla no toca ningún documento ya firmado.** Lo dice la confirmación,
 * porque es justo lo que la gente teme al tocar un botón rojo que dice "quitar
 * firma" — y el miedo, aquí, es infundado.
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';

import {
  useBorrarMiFirma,
  useGuardarMiFirma,
  useMiFirma,
} from 'src/hooks/data/query/useFirma';
import { DesignTokens } from 'src/styles/designTokens';

import FirmaGuardada from './FirmaGuardada';
import PantallaFirma from './PantallaFirma';
import type { Geometria } from './trazo';

const ANCHO = 260;
const ALTO = 96;

interface Props {
  visible: boolean;
  onCerrar: () => void;
}

const PantallaMiFirma: React.FC<Props> = ({ visible, onCerrar }) => {
  const { data: firma, isLoading } = useMiFirma();
  const guardar = useGuardarMiFirma();
  const borrar = useBorrarMiFirma();
  const [trazando, setTrazando] = useState(false);

  // Cerrar vuelve al detalle. Si no se reiniciara, reabrir la pantalla la
  // devolvería en el lienzo, que no es donde la persona la dejó.
  const cerrar = useCallback(() => {
    setTrazando(false);
    onCerrar();
  }, [onCerrar]);

  const confirmar = useCallback(
    (geometria: Geometria) => {
      setTrazando(false);
      guardar.mutate(geometria, {
        onError: () =>
          Alert.alert(
            'No se pudo guardar',
            'Revisa tu conexión e inténtalo otra vez. Mientras tanto puedes ' +
              'firmar cada reporte a mano.',
          ),
      });
    },
    [guardar],
  );

  const pedirBorrado = useCallback(() => {
    Alert.alert(
      '¿Quitar tu firma?',
      'Los reportes que ya firmaste no cambian: cada uno guarda una copia de ' +
        'la firma con la que se emitió. Lo que pasa es que tendrás que ' +
        'dibujarla cada vez que cierres un reporte nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Quitar', style: 'destructive', onPress: () => borrar.mutate() },
      ],
    );
  }, [borrar]);

  const ocupado = guardar.isPending || borrar.isPending;

  return (
    <>
      <Modal
        visible={visible && !trazando}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={cerrar}
      >
        <SafeAreaView style={estilos.raiz}>
          <View style={estilos.barra}>
            <TouchableOpacity onPress={cerrar} hitSlop={12}>
              <Ionicons
                name="chevron-back"
                size={26}
                color={DesignTokens.colors.neutral[600]}
              />
            </TouchableOpacity>
            <Text style={estilos.titulo}>Mi firma</Text>
            {/* Hueco del mismo ancho que el botón, para que el título quede
                centrado de verdad y no desplazado hacia la derecha. */}
            <View style={estilos.hueco} />
          </View>

          <ScrollView contentContainerStyle={estilos.cuerpo}>
            {isLoading ? (
              <ActivityIndicator style={estilos.centro} />
            ) : firma ? (
              <>
                <View style={estilos.muestra}>
                  <FirmaGuardada
                    geometria={firma.geometria}
                    ancho={ANCHO}
                    alto={ALTO}
                  />
                  <View style={estilos.linea} />
                </View>
                <Text style={estilos.pie}>
                  Se inserta sola en cada reporte que cierres.
                </Text>

                <TouchableOpacity
                  style={estilos.boton}
                  onPress={() => setTrazando(true)}
                  disabled={ocupado}
                  activeOpacity={0.85}
                >
                  <Ionicons name="pencil" size={18} color="#FFFFFF" />
                  <Text style={estilos.botonTexto}>Cambiar mi firma</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={estilos.quitar}
                  onPress={pedirBorrado}
                  disabled={ocupado}
                >
                  <Text style={estilos.quitarTexto}>Quitar mi firma</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={estilos.vacio}>
                  <Ionicons
                    name="create-outline"
                    size={44}
                    color={DesignTokens.colors.neutral[300]}
                  />
                </View>
                <Text style={estilos.explicacion}>
                  Da de alta tu firma una vez y se insertará sola en cada
                  reporte que cierres. Si no la das de alta, tendrás que
                  dibujarla cada vez.
                </Text>
                <TouchableOpacity
                  style={estilos.boton}
                  onPress={() => setTrazando(true)}
                  disabled={ocupado}
                  activeOpacity={0.85}
                >
                  <Ionicons name="pencil" size={18} color="#FFFFFF" />
                  <Text style={estilos.botonTexto}>Dar de alta mi firma</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <PantallaFirma
        visible={visible && trazando}
        textoConfirmar="Guardar mi firma"
        onCancelar={() => setTrazando(false)}
        onConfirmar={confirmar}
      />
    </>
  );
};

const estilos = StyleSheet.create({
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
  hueco: { width: 26 },
  cuerpo: {
    padding: DesignTokens.spacing.xl,
    alignItems: 'center',
  },
  centro: { marginVertical: DesignTokens.spacing['4xl'] },
  muestra: {
    alignItems: 'center',
    marginTop: DesignTokens.spacing['2xl'],
  },
  linea: {
    width: ANCHO,
    height: 1,
    backgroundColor: DesignTokens.colors.executive.accent,
  },
  pie: {
    marginTop: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    textAlign: 'center',
    marginBottom: DesignTokens.spacing['3xl'],
  },
  vacio: {
    marginTop: DesignTokens.spacing['3xl'],
    marginBottom: DesignTokens.spacing.lg,
  },
  explicacion: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[600],
    textAlign: 'center',
    lineHeight:
      DesignTokens.typography.fontSize.base *
      DesignTokens.typography.lineHeight.relaxed,
    marginBottom: DesignTokens.spacing['3xl'],
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DesignTokens.spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.md,
    paddingVertical: DesignTokens.spacing.lg,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  quitar: {
    marginTop: DesignTokens.spacing.xl,
    paddingVertical: DesignTokens.spacing.md,
  },
  quitarTexto: {
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.error[600],
  },
});

export default PantallaMiFirma;

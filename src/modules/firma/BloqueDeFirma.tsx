/**
 * El bloque de firma dentro de un documento que se está cerrando.
 *
 * Genérico a propósito: no sabe que existe el reporte de actividades. Recibe
 * la firma y la devuelve; cualquier otro documento que mañana requiera firma
 * monta este mismo bloque.
 *
 * ## Las dos caras
 *
 * - **Ya la tiene dada de alta** → aparece puesta, sin que haga nada. Es el
 *   caso normal: se da de alta una vez y a partir de ahí el sistema la
 *   inserta sola. Puede cambiarla para este documento si quiere.
 * - **No la tiene** → un botón que abre el lienzo, con la opción de guardarla
 *   para no volver a dibujarla.
 *
 * ## Por qué se copia la del perfil al borrador
 *
 * Podría leerse del perfil al enviar y ahorrarse este paso. No se hace por
 * dos razones: el usuario tiene que **ver** qué va a firmar antes de cerrar —
 * firmar sin ver qué se firma no es firmar—, y el reporte puede encolarse
 * días antes de sincronizarse, así que la firma tiene que viajar **dentro**
 * de la captura y no resolverse después.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useGuardarMiFirma, useMiFirma } from 'src/hooks/data/query/useFirma';
import { DesignTokens } from 'src/styles/designTokens';
import type { FirmaPayload } from 'src/types/reporte';

import FirmaGuardada from './FirmaGuardada';
import PantallaFirma from './PantallaFirma';

const ANCHO_VISTA = 240;
const ALTO_VISTA = 86;

interface Props {
  /** La firma que lleva el documento ahora mismo, o `null`. */
  firma: FirmaPayload | null;
  onCambiar: (firma: FirmaPayload | null) => void;
  /** Nombre que se pinta bajo la línea, como en el documento. */
  nombre?: string;
  /** Rótulo del botón del lienzo. */
  textoConfirmar?: string;
}

const BloqueDeFirma: React.FC<Props> = ({
  firma,
  onCambiar,
  nombre,
  textoConfirmar = 'Usar esta firma',
}) => {
  const { data: delPerfil, isLoading } = useMiFirma();
  const guardar = useGuardarMiFirma();
  const [lienzoAbierto, setLienzoAbierto] = useState(false);

  // La inserción automática. Corre una sola vez, cuando llega la del perfil y
  // el documento todavía no tiene ninguna: si corriera también después, le
  // devolvería la del perfil a quien acaba de borrar la suya para rehacerla.
  useEffect(() => {
    if (firma || !delPerfil) return;
    onCambiar(delPerfil.geometria);
  }, [delPerfil, firma, onCambiar]);

  const confirmar = useCallback(
    (geometria: FirmaPayload, guardarEnPerfil: boolean) => {
      onCambiar(geometria);
      setLienzoAbierto(false);
      // Se guarda sin esperar: el documento ya tiene su firma y el alta en el
      // perfil es una comodidad para la próxima vez. Si falla por falta de
      // señal, el cierre no se cae — vuelve a dibujarla la siguiente vez, que
      // es exactamente lo que pasaría si nunca lo hubiera pedido.
      if (guardarEnPerfil) {
        guardar.mutate(geometria, { onError: () => undefined });
      }
    },
    [guardar, onCambiar],
  );

  return (
    <View style={estilos.bloque}>
      <Text style={estilos.rotulo}>FIRMA</Text>

      {firma ? (
        <>
          <View style={estilos.area}>
            <FirmaGuardada
              geometria={firma}
              ancho={ANCHO_VISTA}
              alto={ALTO_VISTA}
            />
          </View>
          <View style={estilos.linea} />
          {nombre ? <Text style={estilos.nombre}>{nombre}</Text> : null}

          <TouchableOpacity
            style={estilos.cambiar}
            onPress={() => setLienzoAbierto(true)}
            hitSlop={8}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={DesignTokens.colors.primary[600]}
            />
            <Text style={estilos.cambiarTexto}>Cambiar para este reporte</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={estilos.aviso}>
            {isLoading
              ? 'Buscando tu firma…'
              : 'Este reporte va firmado. Traza tu firma para cerrarlo.'}
          </Text>
          <TouchableOpacity
            style={estilos.boton}
            onPress={() => setLienzoAbierto(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="pencil" size={18} color="#FFFFFF" />
            <Text style={estilos.botonTexto}>Firmar</Text>
          </TouchableOpacity>
        </>
      )}

      <PantallaFirma
        visible={lienzoAbierto}
        textoConfirmar={textoConfirmar}
        // Solo se ofrece guardar a quien no la tiene. A quien ya la dio de
        // alta y está cambiándola para ESTE documento, cambiarle además la del
        // perfil sería hacer algo que no pidió.
        ofrecerGuardar={!delPerfil}
        onCancelar={() => setLienzoAbierto(false)}
        onConfirmar={confirmar}
      />
    </View>
  );
};

const estilos = StyleSheet.create({
  bloque: {
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing.xl,
    paddingHorizontal: DesignTokens.spacing.lg,
  },
  rotulo: {
    fontSize: DesignTokens.typography.fontSize.xs,
    letterSpacing: 1,
    color: DesignTokens.colors.neutral[500],
    marginBottom: DesignTokens.spacing.md,
  },
  area: { height: ALTO_VISTA, justifyContent: 'flex-end' },
  linea: {
    width: ANCHO_VISTA,
    height: 1,
    backgroundColor: DesignTokens.colors.executive.accent,
  },
  nombre: {
    marginTop: DesignTokens.spacing.sm,
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.executive.primary,
  },
  cambiar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.xs,
    marginTop: DesignTokens.spacing.lg,
  },
  cambiarTexto: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.primary[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  aviso: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    textAlign: 'center',
    marginBottom: DesignTokens.spacing.lg,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.md,
    paddingVertical: DesignTokens.spacing.md,
    paddingHorizontal: DesignTokens.spacing['2xl'],
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
});

export default BloqueDeFirma;

/**
 * Una firma ya guardada, dibujada en una caja del tamaño que se le dé.
 *
 * Estático: no acepta gestos. Se usa en la tarjeta del perfil y en el paso de
 * cierre del reporte, donde lo que hace falta es que la persona **reconozca**
 * su firma antes de que se estampe, no que la vuelva a trazar.
 *
 * Encaja igual que el servidor: recorta a la TINTA y no al lienzo, conserva la
 * proporción y centra. Por eso lo que se ve aquí es lo que va a salir impreso,
 * con el mismo encuadre.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DesignTokens } from 'src/styles/designTokens';
import { Geometria, caminoCompleto, encajar, grosorDePluma } from './trazo';

interface Props {
  geometria: Geometria;
  ancho: number;
  alto: number;
  color?: string;
  /** Aire alrededor de la tinta, para que no toque los bordes. */
  margen?: number;
}

const FirmaGuardada: React.FC<Props> = ({
  geometria,
  ancho,
  alto,
  color = DesignTokens.colors.executive.accent,
  margen = 6,
}) => {
  const { camino, pluma } = useMemo(() => {
    const caja = {
      x: margen,
      y: margen,
      ancho: Math.max(1, ancho - margen * 2),
      alto: Math.max(1, alto - margen * 2),
    };
    const encaje = encajar(geometria, caja);
    return {
      camino: caminoCompleto(encaje.trazos),
      // La pluma escala con la firma: una firma trazada pequeña y ampliada
      // conserva su proporción de grosor, que es lo que la hace reconocible
      // como la misma firma.
      pluma: Math.max(
        0.8,
        grosorDePluma(geometria.ancho, geometria.alto) * encaje.escala,
      ),
    };
  }, [alto, ancho, geometria, margen]);

  return (
    <View style={[styles.caja, { width: ancho, height: alto }]}>
      <Svg width={ancho} height={alto}>
        <Path
          d={camino}
          stroke={color}
          strokeWidth={pluma}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  caja: { overflow: 'hidden' },
});

export default FirmaGuardada;

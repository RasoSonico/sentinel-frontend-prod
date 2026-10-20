import { useCallback, useEffect, useRef, useState } from "react";

import {
  ANCHO_FOTO_REPORTE,
  usePhotoCapture,
} from "src/hooks/avance/usePhotoCapture";
import { getFileSize } from "src/services/api/photoService";

import { MAX_FOTOS } from "../constantes";
import type { FotoBorrador } from "../state/BorradorReporteContext";
import { useBorradorReporte } from "../state/BorradorReporteContext";

/**
 * Captura de fotos del reporte, en un solo lugar (ADR-006, Decisiones 4 y 9).
 *
 * Vive por encima del paso 2 porque **el carrusel también agrega fotos**: su
 * "＋ Agregar otra" abre cámara o galería sin salir de la tanda. Con el hook
 * dentro del paso, esa acción no tendría a quién llamar y habría que devolver
 * al usuario a la lista para que volviera a tocar un origen — dos toques de
 * castigo por querer una foto más.
 *
 * `usePhotoCapture` se usa como **bandeja de entrada**: captura, reescala a
 * `ANCHO_FOTO_REPORTE` (las del reporte se imprimen, no solo se miran) y guarda
 * el archivo local. En cuanto entrega, este hook las pasa al borrador —que es
 * quien manda el orden y los pies— y vacía la bandeja. Sin ese trasvase habría
 * dos listas de fotos compitiendo por ser la buena.
 */
/**
 * Renumera el sufijo `_NN` de un nombre de archivo según su posición final.
 *
 * "Partida_01.jpg" capturada cuando el borrador ya tenía dos fotos se vuelve
 * "Partida_03.jpg". Conserva la extensión y el nombre base.
 */
const conPosicion = (nombre: string, posicion: number): string => {
  const punto = nombre.lastIndexOf(".");
  const extension = punto > 0 ? nombre.slice(punto) : ".jpg";
  const base = (punto > 0 ? nombre.slice(0, punto) : nombre).replace(/_\d+$/, "");
  return `${base}_${String(posicion).padStart(2, "0")}${extension}`;
};

export function useCapturaFotosReporte() {
  const { borrador, agregarFotos } = useBorradorReporte();
  const restantes = MAX_FOTOS - borrador.fotos.length;

  const {
    photos: bandeja,
    loading,
    takePhoto,
    pickImage,
    clearPhotos,
  } = usePhotoCapture({
    maxPhotos: Math.max(restantes, 1),
    compressionQuality: 0.85,
    anchoMaximo: ANCHO_FOTO_REPORTE,
    includeLocation: false,
  });

  /** Ids de la última tanda trasvasada, para llevar el carrusel a ellas. */
  const [idsUltimaTanda, setIdsUltimaTanda] = useState<string[]>([]);
  const totalPrevioRef = useRef(0);
  const esperandoTrasvaseRef = useRef(false);

  useEffect(() => {
    if (bandeja.length === 0) return;

    let cancelado = false;
    esperandoTrasvaseRef.current = true;
    totalPrevioRef.current = borrador.fotos.length;

    (async () => {
      const nuevas: Omit<FotoBorrador, "id">[] = await Promise.all(
        bandeja.map(async (foto, i) => ({
          localUri: foto.localUri,
          // Renumerado por la posición en el BORRADOR, no en la tanda.
          // `usePhotoCapture` numera con su propio contador y aquí se vacía
          // tras cada trasvase, así que toda tanda posterior a la primera
          // volvía a producir `Partida_01.jpg`. Nombres repetidos en el mismo
          // reporte, que además reventaban el POST del lado del servidor.
          filename: conPosicion(foto.filename, totalPrevioRef.current + i + 1),
          // El tamaño real lo vuelve a medir el servidor al confirmar; aquí
          // solo sirve para la cola, así que un fallo de lectura no es motivo
          // para perder la foto.
          fileSize: await getFileSize(foto.localUri).catch(() => 0),
          pie: "",
          takenAt: new Date(foto.timestamp),
        })),
      );
      if (cancelado) return;

      agregarFotos(nuevas);
      clearPhotos();
    })();

    return () => {
      cancelado = true;
    };
    // `borrador.fotos.length` queda fuera a propósito: si entrara, el efecto se
    // re-dispararía con el propio trasvase que acaba de hacer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandeja, agregarFotos, clearPhotos]);

  // Las ids solo se pueden leer cuando el borrador YA aplicó el trasvase, de
  // ahí el segundo efecto.
  useEffect(() => {
    if (!esperandoTrasvaseRef.current || bandeja.length > 0) return;
    const nuevas = borrador.fotos.slice(totalPrevioRef.current);
    if (nuevas.length === 0) return;
    esperandoTrasvaseRef.current = false;
    setIdsUltimaTanda(nuevas.map((f) => f.id));
  }, [bandeja.length, borrador.fotos]);

  const consumirTanda = useCallback(() => setIdsUltimaTanda([]), []);

  return {
    tomarFoto: takePhoto,
    elegirDeGaleria: pickImage,
    cargando: loading,
    restantes,
    lleno: restantes <= 0,
    /** No vacío justo después de una captura; el wizard abre el carrusel. */
    idsUltimaTanda,
    consumirTanda,
  };
}

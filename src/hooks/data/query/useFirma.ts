import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  FirmaDePerfil,
  borrarMiFirma,
  getMiFirma,
  guardarMiFirma,
} from "src/hooks/data/api/firmaApi";
import type { Geometria } from "src/modules/firma/trazo";

export const FIRMA_QUERY_KEYS = {
  mia: "miFirma",
};

/**
 * La firma del perfil.
 *
 * **Tiene que seguir ahí sin señal.** Firmar es obligatorio para cerrar un
 * reporte, y un reporte se cierra en obra: si esta consulta volviera vacía
 * porque no hay red, la persona que YA dio de alta su firma tendría que
 * volver a dibujarla, o peor, no podría cerrar. Por eso la caché se declara
 * larga y no se refresca al montar — el provider ya la persiste en
 * AsyncStorage, así que sobrevive a cerrar la app.
 *
 * `data === null` significa "no la ha dado de alta" y es un resultado válido,
 * no un error: es la señal para mostrar el lienzo al cerrar un documento.
 */
export const useMiFirma = () =>
  useQuery<FirmaDePerfil | null>({
    queryKey: [FIRMA_QUERY_KEYS.mia],
    queryFn: getMiFirma,
    // Un mes. La firma cambia cuando su dueño la cambia, y eso pasa por la
    // mutación de abajo, que invalida esta clave al instante. No hay ninguna
    // otra vía por la que pueda quedar desactualizada.
    staleTime: 30 * 24 * 60 * 60 * 1000,
    gcTime: 30 * 24 * 60 * 60 * 1000,
    retry: 1,
  });

export const useGuardarMiFirma = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (geometria: Geometria) => guardarMiFirma(geometria),
    onSuccess: (firma) => {
      // Se escribe el resultado en vez de invalidar: invalidar dispararía una
      // lectura que sin señal fallaría, y dejaría al usuario viendo el lienzo
      // vacío justo después de haber guardado su firma.
      cliente.setQueryData([FIRMA_QUERY_KEYS.mia], firma);
    },
  });
};

export const useBorrarMiFirma = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: borrarMiFirma,
    onSuccess: () => {
      cliente.setQueryData([FIRMA_QUERY_KEYS.mia], null);
    },
  });
};

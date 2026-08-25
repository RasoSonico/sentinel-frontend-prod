import { useQuery } from "@tanstack/react-query";
import { getAdvancesByConcept } from "src/hooks/data/api/avanceApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";

export interface CargaHistorial {
  id: number;
  fecha: string;
  volumen: number;
  tieneFoto: boolean;
}

/**
 * Historial completo de un concepto, BAJO DEMANDA (opción A del análisis de
 * trazabilidad).
 *
 * `enabled` se controla desde fuera: la ficha solo lo activa cuando el usuario
 * toca "Ver historial completo". Las 4 más recientes ya vienen en el paquete
 * offline, así que abrir la ficha NO dispara nada de red — la regla de D13.1
 * ("nunca un fetch al abrir") se conserva.
 *
 * Sin cache Realm a propósito: es una consulta puntual y explícita, no un dato
 * que la app deba tener disponible sin conexión. Si no hay red, el botón no
 * ofrece nada y las 4 del paquete siguen ahí.
 */
export function useHistorialConcepto(
  conceptId: number | undefined,
  habilitado: boolean,
) {
  const isOnline = useNetworkStatus();

  const query = useQuery({
    queryKey: ["historialConcepto", conceptId],
    queryFn: () => getAdvancesByConcept({ conceptId: conceptId! }),
    enabled: !!conceptId && habilitado && isOnline === true,
    staleTime: 60 * 1000,
  });

  const cargas: CargaHistorial[] = (query.data?.advances ?? []).map((a) => ({
    id: a.id,
    fecha: a.date,
    volumen: parseFloat(a.volume) || 0,
    tieneFoto: (a.photo_count ?? 0) > 0,
  }));

  return {
    cargas,
    total: query.data?.count ?? 0,
    cargando: query.isFetching,
    error: query.isError,
    // Sin conexión el historial completo no se puede traer; la UI lo dice en
    // vez de mostrar una lista vacía que parecería "no hay cargas".
    sinConexion: isOnline === false,
  };
}

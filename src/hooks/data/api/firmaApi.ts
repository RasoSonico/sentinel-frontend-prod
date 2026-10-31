import { apiRequest } from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";
import type { Geometria } from "src/modules/firma/trazo";

export interface FirmaDePerfil {
  geometria: Geometria;
  creada_en: string;
  actualizada_en: string;
}

/**
 * ¿Fue un 404?
 *
 * Se mira `status` y también `response.status`: el cliente envuelve los
 * errores de red en `ApiError`, que trae `status` plano, pero el error de
 * axios sin envolver lo trae bajo `response`. Mirar solo uno dejaría pasar un
 * 404 como fallo según por dónde viniera.
 */
const esNoEncontrado = (error: unknown): boolean => {
  const posible = error as { status?: number; response?: { status?: number } };
  return posible?.status === 404 || posible?.response?.status === 404;
};

/**
 * La firma del usuario que hace la petición.
 *
 * **`null` cuando no la ha dado de alta**, que es parte del flujo y no un
 * fallo: significa "esta persona todavía la dibuja cada vez". El servidor
 * contesta 404 y aquí se traduce, porque un 404 propagado haría que
 * react-query lo trate como error y pinte una franja roja por algo normal.
 *
 * La ruta no lleva identificador: una firma pertenece a un y solo un usuario,
 * así que el único posible es quién pregunta.
 */
export const getMiFirma = async (): Promise<FirmaDePerfil | null> => {
  try {
    return await apiRequest<FirmaDePerfil>(
      "get",
      API_CONFIG.endpoints.firma.mia,
      "Error al leer tu firma",
    );
  } catch (error: unknown) {
    if (esNoEncontrado(error)) return null;
    throw error;
  }
};

/** Da de alta o reemplaza la firma. No toca ningún documento ya firmado. */
export const guardarMiFirma = async (
  geometria: Geometria,
): Promise<FirmaDePerfil> =>
  apiRequest<FirmaDePerfil>(
    "put",
    API_CONFIG.endpoints.firma.mia,
    "Error al guardar tu firma",
    { geometria },
  );

/** Quita la firma guardada. Tampoco toca lo ya firmado. */
export const borrarMiFirma = async (): Promise<void> => {
  await apiRequest<void>(
    "delete",
    API_CONFIG.endpoints.firma.mia,
    "Error al borrar tu firma",
  );
};

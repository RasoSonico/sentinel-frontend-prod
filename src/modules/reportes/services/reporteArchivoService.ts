import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import apiClient from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";

/**
 * Descarga del entregable (ADR-006, Decisión 8).
 *
 * Copia el transporte que `reportService.ts` ya usa para la tabla de avances —
 * arraybuffer → base64 → `cacheDirectory` → hoja de compartir del sistema— y le
 * agrega lo único propio de este documento: **el 409**.
 *
 * Generar es **repetible y para todos los miembros de la obra**: el archivo es
 * un derivado, no un artefacto, y quien lo manda al cliente no siempre es quien
 * lo capturó. Cada toque pinta el documento con el pintor más reciente.
 */

export type FormatoReporte = "xlsx" | "pdf";

const CONTENT_TYPES: Record<FormatoReporte, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

const UTI: Record<FormatoReporte, string> = {
  xlsx: "com.microsoft.excel.xlsx",
  pdf: "com.adobe.pdf",
};

export class ReporteArchivoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReporteArchivoError";
  }
}

/**
 * El servidor tiene fotos declaradas que aún no suben.
 *
 * Se distingue del resto de errores porque **no es un fallo**: es un "todavía
 * no". La interfaz lo traduce a la franja ámbar con la razón, no a un mensaje
 * de error rojo — el reporte está bien, solo le falta llegar completo.
 */
export class FotosPendientesError extends ReporteArchivoError {
  constructor(
    public readonly declaradas: number,
    public readonly subidas: number,
    message: string,
  ) {
    super(message);
    this.name = "FotosPendientesError";
  }
}

function decodificarError(datos: ArrayBuffer): Record<string, unknown> {
  try {
    const texto = Buffer.from(datos).toString("utf-8");
    return JSON.parse(texto) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function descargarReporte(
  reporteId: number,
  formato: FormatoReporte,
  nombreSugerido: string,
): Promise<void> {
  const url = `${API_CONFIG.endpoints.reportes.actividades}${reporteId}/archivo?formato=${formato}`;

  // `arraybuffer` para que el interceptor de axios ponga el token igual que en
  // cualquier otra llamada; `validateStatus` para manejar el 409 aquí y no
  // como excepción genérica de red.
  const respuesta = await apiClient.get(url, {
    responseType: "arraybuffer",
    validateStatus: () => true,
  });

  if (respuesta.status === 409) {
    const cuerpo = decodificarError(respuesta.data as ArrayBuffer);
    throw new FotosPendientesError(
      Number(cuerpo.fotos_declaradas ?? 0),
      Number(cuerpo.fotos_subidas ?? 0),
      String(
        cuerpo.detail ??
          "El reporte todavía tiene fotografías subiéndose.",
      ),
    );
  }

  if (respuesta.status !== 200) {
    const cuerpo = decodificarError(respuesta.data as ArrayBuffer);
    throw new ReporteArchivoError(
      String(cuerpo.detail ?? cuerpo.error ?? "No se pudo generar el archivo."),
    );
  }

  const buffer = respuesta.data as ArrayBuffer;
  const bytes = new Uint8Array(buffer);
  let binario = "";
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  const base64 = btoa(binario);

  const nombre = `${nombreSugerido}.${formato}`;
  const destino = `${FileSystem.cacheDirectory}${nombre}`;

  await FileSystem.writeAsStringAsync(destino, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new ReporteArchivoError(
      "La función de compartir no está disponible en este dispositivo.",
    );
  }

  await Sharing.shareAsync(destino, {
    mimeType: CONTENT_TYPES[formato],
    dialogTitle: "Compartir el reporte de actividades",
    UTI: UTI[formato],
  });
}

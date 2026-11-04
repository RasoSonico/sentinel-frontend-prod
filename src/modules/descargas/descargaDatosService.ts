import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import apiClient from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";

/**
 * "Descargar datos" de Perfil: el Excel SIN formato de la obra.
 *
 * Mismo transporte que el archivo del reporte (`reporteArchivoService.ts`):
 * arraybuffer → base64 → `cacheDirectory` → hoja de compartir del sistema. El
 * usuario decide ahí si lo guarda en Archivos, lo manda o lo abre en Excel.
 *
 * Qué trae cada hoja está en `docs/descargar-datos.md`.
 */

export type TablaDescargable = "actividades" | "maquinaria";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const UTI_XLSX = "com.microsoft.excel.xlsx";

export class DescargaDatosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DescargaDatosError";
  }
}

function decodificarError(datos: ArrayBuffer): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(datos).toString("utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * "Autopista 75D – Matehuala" → "Autopista_75D_Matehuala". El nombre viaja a
 * otros teléfonos y computadoras: sin acentos ni símbolos que algún sistema
 * de archivos rechace.
 */
const nombreSeguro = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    // El nombre de obra admite 500; el archivo no debe pasar de 255.
    .slice(0, 60)
    .replace(/^_+|_+$/g, "") || "obra";

export async function descargarDatos(params: {
  obraId: number;
  obraNombre: string;
  /** Fechas de calendario LOCALES, `YYYY-MM-DD`, ambos extremos incluidos. */
  desde: string;
  hasta: string;
  tablas: TablaDescargable[];
}): Promise<void> {
  const consulta = new URLSearchParams({
    construction_id: String(params.obraId),
    desde: params.desde,
    hasta: params.hasta,
    tablas: params.tablas.join(","),
  });

  // `arraybuffer` para que el interceptor ponga el token como en cualquier
  // otra llamada; `validateStatus` para leer el `detail` de un 400 o un 404
  // en vez de recibir un error genérico de red.
  const respuesta = await apiClient.get(
    `${API_CONFIG.endpoints.tablas.excel}?${consulta.toString()}`,
    { responseType: "arraybuffer", validateStatus: () => true },
  );

  if (respuesta.status !== 200) {
    const cuerpo = decodificarError(respuesta.data as ArrayBuffer);
    throw new DescargaDatosError(
      String(cuerpo.detail ?? "No se pudo generar el archivo. Inténtalo otra vez."),
    );
  }

  const bytes = new Uint8Array(respuesta.data as ArrayBuffer);
  let binario = "";
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);

  const destino =
    `${FileSystem.cacheDirectory}Datos_${nombreSeguro(params.obraNombre)}` +
    `_${params.desde}_al_${params.hasta}.xlsx`;
  await FileSystem.writeAsStringAsync(destino, btoa(binario), {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new DescargaDatosError(
      "La función de compartir no está disponible en este dispositivo.",
    );
  }

  await Sharing.shareAsync(destino, {
    mimeType: XLSX,
    dialogTitle: "Datos de la obra",
    UTI: UTI_XLSX,
  });
}

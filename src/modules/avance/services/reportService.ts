import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import apiClient from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";

export type ReportScope = "all" | "period";

export interface AdvanceReportParams {
  constructionId: string | number;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  scope: ReportScope;
}

export class ReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportError";
  }
}

export async function downloadAdvanceReport(
  params: AdvanceReportParams,
): Promise<void> {
  const { constructionId, dateFrom, dateTo, scope } = params;

  const queryParams = new URLSearchParams({
    construction_id: String(constructionId),
    date_from: dateFrom,
    date_to: dateTo,
    scope,
  });

  const url = `${API_CONFIG.endpoints.reportes.physicalAdvance}?${queryParams.toString()}`;

  // Fetch as arraybuffer so the axios auth interceptor adds the token automatically
  const response = await apiClient.get(url, {
    responseType: "arraybuffer",
    validateStatus: () => true, // handle all status codes manually
  });

  if (response.status !== 200) {
    // Decode the error JSON from the arraybuffer
    let errorMessage = "Error al generar el reporte.";
    try {
      const text = Buffer.from(response.data as ArrayBuffer).toString("utf-8");
      const json = JSON.parse(text);
      if (json?.error) errorMessage = json.error;
    } catch {
      // leave default message
    }
    throw new ReportError(errorMessage);
  }

  // Convert arraybuffer to base64
  const buffer = response.data as ArrayBuffer;
  const uint8 = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  // Build a filename from the date params
  const safeName = `Avance_Fisico`;
  const filename =
    dateFrom === dateTo
      ? `${safeName}_${dateFrom}.xlsx`
      : `${safeName}_${dateFrom}_al_${dateTo}.xlsx`;

  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new ReportError(
      "La función de compartir no está disponible en este dispositivo.",
    );
  }

  await Sharing.shareAsync(fileUri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Compartir reporte de avance",
    UTI: "com.microsoft.excel.xlsx",
  });
}

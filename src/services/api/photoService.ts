import { Image } from "react-native";
import * as Device from "expo-device";
import { apiRequest } from "./apiClient";
import { API_CONFIG } from "./config";

// Interfaces para el servicio de fotos
export interface PhotoUploadRequest {
  physical_advance_id: number;
  construction_id: number;
  filename: string;
  file_size: number;
  content_type: string;
  device_model?: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  taken_at: string; // ISO string
  image_width?: number;
  image_height?: number;
}

export interface PhotoUploadResponse {
  photo_id: string;
  upload_url: string;
  blob_path: string;
  expires_at: string;
  instructions: {
    method: string;
    headers: {
      "x-ms-blob-type": string;
      "Content-Type": string;
    };
    note: string;
  };
}

export interface BulkUploadRequest {
  photos: PhotoUploadRequest[];
}

export interface BulkUploadResponse {
  upload_sessions?: Array<{
    photo_id: string;
    filename: string;
    upload_url: string;
    blob_path?: string;
    expires_at: string;
  }>;
  // Formato alternativo para compatibilidad
  results?: Array<{
    photo_id: string;
    filename: string;
    upload_url: string;
    blob_path?: string;
    expires_at: string;
    success?: boolean;
    error?: string;
  }>;
  total_requested?: number;
  successful?: number;
  failed?: number;
}

export interface CameraInfo {
  make?: string;
  model?: string;
  datetime?: string;
}

export interface ConfirmUploadRequest {
  photo_id: string;
  upload_successful: boolean;
  error_message?: string;
  camera_info?: CameraInfo;
}

export interface ConfirmUploadResponse {
  message: string;
  photo_id: string;
  status: string;
}

/**
 * Result of Azure Blob upload with detailed error info
 */
export interface AzureUploadResult {
  success: boolean;
  statusCode?: number;
  errorType?: "network" | "expired_sas" | "forbidden" | "not_found" | "server_error" | "unknown";
  errorMessage?: string;
}

/**
 * Get user-friendly error message for Azure upload failures
 */
export function getAzureUploadErrorMessage(result: AzureUploadResult): string {
  if (result.success) return "";

  switch (result.errorType) {
    case "network":
      return "Error de conexión. Verifica tu conexión a internet.";
    case "expired_sas":
      return "El token de subida expiró. Se reintentará automáticamente.";
    case "forbidden":
      return "Acceso denegado al servidor de almacenamiento.";
    case "not_found":
      return "El destino de subida no existe.";
    case "server_error":
      return "Error en el servidor de almacenamiento. Intenta de nuevo.";
    default:
      return result.errorMessage || "Error desconocido al subir la foto.";
  }
}

/**
 * Solicitar SAS token para subir una foto individual
 */
export const requestSingleUpload = async (
  photoData: PhotoUploadRequest
): Promise<PhotoUploadResponse> => {
  return await apiRequest<PhotoUploadResponse>(
    "post",
    API_CONFIG.endpoints.photos.upload,
    "Error al solicitar token de subida",
    photoData
  );
};

/**
 * Solicitar SAS tokens para subir múltiples fotos
 */
export const requestBulkUpload = async (
  photosData: BulkUploadRequest
): Promise<BulkUploadResponse> => {
  console.log("📤 [API] Requesting bulk upload with data:", photosData);
  console.log("📤 [API] Endpoint:", API_CONFIG.endpoints.photos.bulkUpload);

  const response = await apiRequest<BulkUploadResponse>(
    "post",
    API_CONFIG.endpoints.photos.bulkUpload,
    "Error al solicitar tokens de subida múltiple",
    photosData
  );

  console.log("📤 [API] Bulk upload response:", response);
  return response;
};

/**
 * Subir archivo directamente a Azure Blob Storage
 * Returns detailed result with error information
 */
export const uploadToAzureBlob = async (
  uploadUrl: string,
  fileData: Blob,
  contentType: string
): Promise<AzureUploadResult> => {
  try {
    console.log("🔵 Azure Blob Upload - Starting direct upload to:", uploadUrl);
    console.log("🔵 File info:", { size: fileData.size, type: contentType });

    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: fileData,
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": contentType,
      },
    });

    console.log("🔵 Azure Blob Upload - Response status:", response.status);

    // Success case
    if (response.status === 201) {
      console.log("🔵 Azure Blob Upload - Success");
      return { success: true, statusCode: 201 };
    }

    // Determine error type based on status code
    let errorType: AzureUploadResult["errorType"] = "unknown";
    let errorMessage = `HTTP ${response.status}`;

    switch (response.status) {
      case 403:
        // SAS token expired or invalid
        errorType = "expired_sas";
        errorMessage = "SAS token expired or invalid";
        break;
      case 404:
        errorType = "not_found";
        errorMessage = "Blob container or path not found";
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = "server_error";
        errorMessage = "Azure storage server error";
        break;
      default:
        if (response.status >= 400 && response.status < 500) {
          errorType = "forbidden";
          errorMessage = `Client error: ${response.status}`;
        } else {
          errorType = "unknown";
          errorMessage = `Unexpected status: ${response.status}`;
        }
    }

    console.error("❌ Azure Blob Upload - Failed:", { statusCode: response.status, errorType, errorMessage });

    return {
      success: false,
      statusCode: response.status,
      errorType,
      errorMessage,
    };
  } catch (error) {
    console.error("❌ Error uploading to Azure Blob:", error);

    // Network error (no response received)
    const errorMessage = error instanceof Error ? error.message : "Unknown network error";

    return {
      success: false,
      errorType: "network",
      errorMessage,
    };
  }
};

/**
 * Confirmar que la subida fue exitosa
 */
export const confirmUpload = async (
  confirmData: ConfirmUploadRequest
): Promise<ConfirmUploadResponse> => {
  console.log("🟡 Confirm Upload - Sending data:", confirmData);
  console.log(
    "🟡 Confirm Upload - Endpoint:",
    API_CONFIG.endpoints.photos.confirmUpload
  );
  console.log("🟡 Confirm Upload - Method: POST");

  try {
    const result = await apiRequest<ConfirmUploadResponse>(
      "post",
      API_CONFIG.endpoints.photos.confirmUpload,
      "Error al confirmar subida de foto",
      confirmData
    );

    console.log("🟡 Confirm Upload - Success:", result);
    return result;
  } catch (error) {
    console.error("🟡 Confirm Upload - Error:", error);
    throw error;
  }
};

/**
 * Convertir URI de imagen a Blob para upload
 */
export const uriToBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

/**
 * Obtener el tamaño de archivo desde la URI
 */
export const getFileSize = async (uri: string): Promise<number> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch (error) {
    console.error("Error getting file size:", error);
    return 0;
  }
};

/**
 * Obtener las dimensiones de la imagen usando React Native Image.getSize
 */
export const getImageDimensions = async (
  uri: string
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => {
        resolve({ width, height });
      },
      (error) => {
        console.warn("Could not get image dimensions:", error);
        resolve({ width: 1200, height: 800 }); // Valores por defecto razonables
      }
    );
  });
};

/**
 * Obtener información de la cámara/dispositivo
 */
export const getCameraInfo = (): CameraInfo => {
  return {
    make: Device.manufacturer || "Mobile Device",
    model: Device.modelName || "Unknown Device",
    datetime: new Date().toISOString(),
  };
};

import { useState } from "react";
import {
  PhotoUploadRequest,
  requestSingleUpload,
  requestBulkUpload,
  uploadToAzureBlob,
  confirmUpload,
  uriToBlob,
  getFileSize,
  getImageDimensions,
  getCameraInfo,
  getAzureUploadErrorMessage,
} from "../../services/api/photoService";
import { Photo } from "./usePhotoCapture";
import { LocationData } from "./useGeolocation";
import * as Device from "expo-device";

export interface PhotoUploadProgress {
  photoId: string;
  filename: string;
  status: "pending" | "uploading" | "completed" | "failed";
  progress: number; // 0-100
  error?: string;
}

export interface UploadResult {
  success: boolean;
  uploadedPhotos: number;
  totalPhotos: number;
  errors: string[];
  details: PhotoUploadProgress[];
}

interface UsePhotoUploadProps {
  constructionId: number;
  onProgress?: (progress: PhotoUploadProgress[]) => void;
  onComplete?: (result: UploadResult) => void;
}

export const usePhotoUpload = ({
  constructionId,
  onProgress,
  onComplete,
}: UsePhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<PhotoUploadProgress[]>(
    [],
  );

  /**
   * Preparar datos de foto para upload
   */
  const preparePhotoData = async (
    photo: Photo,
    physicalAdvanceId: number,
    location?: LocationData,
  ): Promise<PhotoUploadRequest> => {
    const fileSize = await getFileSize(photo.uri);
    const dimensions = await getImageDimensions(photo.uri);
    const filename = photo.filename;

    return {
      physical_advance_id: physicalAdvanceId,
      construction_id: constructionId,
      filename,
      file_size: fileSize,
      content_type: "image/jpeg",
      device_model: Device.modelName ?? "Unknown Device",
      latitude: location?.latitude || photo.location?.latitude,
      longitude: location?.longitude || photo.location?.longitude,
      gps_accuracy: location?.accuracy || undefined,
      taken_at: new Date(photo.timestamp).toISOString(),
      image_width: dimensions.width,
      image_height: dimensions.height,
    };
  };

  /**
   * Actualizar progreso de una foto específica
   */
  const updatePhotoProgress = (
    photoId: string,
    updates: Partial<PhotoUploadProgress>,
  ) => {
    setUploadProgress((prev) => {
      const updated = prev.map((p) =>
        p.photoId === photoId ? { ...p, ...updates } : p,
      );
      onProgress?.(updated);
      return updated;
    });
  };

  /**
   * Subir una sola foto
   */
  const uploadSinglePhoto = async (
    photo: Photo,
    physicalAdvanceId: number,
    location?: LocationData,
  ): Promise<boolean> => {
    const photoId = photo.id;

    try {
      // Preparar datos
      const photoData = await preparePhotoData(
        photo,
        physicalAdvanceId,
        location,
      );

      updatePhotoProgress(photoId, { status: "uploading", progress: 10 });

      // Paso 1: Solicitar SAS token
      const uploadResponse = await requestSingleUpload(photoData);
      updatePhotoProgress(photoId, { progress: 30 });

      // Paso 2: Convertir URI a Blob
      const fileBlob = await uriToBlob(photo.uri);
      updatePhotoProgress(photoId, { progress: 50 });

      // Paso 3: Subir a Azure Blob
      console.log("📤 Uploading to Azure Blob:", {
        upload_url: uploadResponse.upload_url,
        file_size: fileBlob.size,
        content_type: "image/jpeg",
      });

      const azureResult = await uploadToAzureBlob(
        uploadResponse.upload_url,
        fileBlob,
        "image/jpeg",
      );

      console.log("📤 Azure Blob upload result:", azureResult);
      updatePhotoProgress(photoId, { progress: 80 });

      const uploadSuccess = azureResult.success;
      const errorMessage = uploadSuccess
        ? undefined
        : getAzureUploadErrorMessage(azureResult);

      // Paso 4: Confirmar subida
      const cameraInfo = getCameraInfo();
      console.log("🔄 Confirming upload with data:", {
        photo_id: uploadResponse.photo_id,
        upload_successful: uploadSuccess,
        error_message: errorMessage,
        camera_info: cameraInfo,
      });

      await confirmUpload({
        photo_id: uploadResponse.photo_id,
        upload_successful: uploadSuccess,
        error_message: errorMessage,
        camera_info: cameraInfo,
      });

      console.log("✅ Upload confirmed successfully");

      updatePhotoProgress(photoId, {
        status: uploadSuccess ? "completed" : "failed",
        progress: 100,
        error: errorMessage,
      });

      return uploadSuccess;
    } catch (error) {
      console.error("Error uploading single photo:", error);
      updatePhotoProgress(photoId, {
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  };

  /**
   * Subir múltiples fotos usando bulk upload
   */
  const uploadMultiplePhotos = async (
    photos: Photo[],
    physicalAdvanceId: number,
    location?: LocationData,
  ): Promise<UploadResult> => {
    try {
      // Preparar datos para todas las fotos
      const photosData = await Promise.all(
        photos.map((photo) =>
          preparePhotoData(photo, physicalAdvanceId, location),
        ),
      );

      // Inicializar progreso
      photos.forEach((photo) => {
        updatePhotoProgress(photo.id, { status: "uploading", progress: 10 });
      });

      // Paso 1: Solicitar SAS tokens en bulk
      console.log(
        "📤 [BULK] Requesting bulk upload for photos:",
        photosData.length,
      );
      const bulkResponse = await requestBulkUpload({
        photos: photosData,
      });

      console.log("📤 [BULK] Bulk response received:", bulkResponse);

      // Validar estructura de respuesta - intentar diferentes formatos
      let uploadSessions: Array<{
        photo_id: string;
        filename: string;
        upload_url: string;
        blob_path?: string;
        expires_at: string;
      }> = [];

      if (
        bulkResponse.upload_sessions &&
        Array.isArray(bulkResponse.upload_sessions)
      ) {
        // Formato esperado: { upload_sessions: [...] }
        uploadSessions = bulkResponse.upload_sessions;
        console.log("✅ [BULK] Using upload_sessions format");
      } else if (bulkResponse.results && Array.isArray(bulkResponse.results)) {
        // Formato alternativo: { results: [...] }
        console.log("⚠️ [BULK] Using legacy results format");
        uploadSessions = bulkResponse.results.map((result) => ({
          photo_id: result.photo_id,
          filename: result.filename,
          upload_url: result.upload_url,
          blob_path: result.blob_path,
          expires_at: result.expires_at,
        }));
      } else {
        console.error(
          "❌ [BULK] Invalid bulk response structure:",
          bulkResponse,
        );
        throw new Error("Invalid bulk upload response from server");
      }

      if (uploadSessions.length !== photos.length) {
        console.error("❌ [BULK] Mismatch in response count:", {
          requested: photos.length,
          received: uploadSessions.length,
        });
        throw new Error("Bulk upload response count mismatch");
      }

      console.log(
        "✅ [BULK] Response validation passed, processing",
        uploadSessions.length,
        "upload sessions",
      );

      // Actualizar progreso después de obtener tokens
      photos.forEach((photo) => {
        updatePhotoProgress(photo.id, { progress: 30 });
      });

      // Paso 2: Subir fotos en paralelo a Azure Blob
      const uploadPromises = uploadSessions.map(
        async (uploadSession, index) => {
          const photo = photos[index];
          const photoId = photo.id;

          console.log(`📸 [PHOTO ${index + 1}] Processing photo:`, {
            photoId,
            filename: photo.filename,
            uploadSession: uploadSession,
          });

          if (!uploadSession.upload_url) {
            console.error(
              `❌ [PHOTO ${index + 1}] Missing upload URL for photo ${photoId}`,
            );
            updatePhotoProgress(photoId, {
              status: "failed",
              progress: 0,
              error: "Failed to get upload URL",
            });
            return {
              photoId,
              success: false,
              error: "Failed to get upload URL",
            };
          }

          try {
            // Convertir URI a Blob
            const fileBlob = await uriToBlob(photo.uri);
            updatePhotoProgress(photoId, { progress: 50 });

            // Subir a Azure
            const azureResult = await uploadToAzureBlob(
              uploadSession.upload_url,
              fileBlob,
              "image/jpeg",
            );
            updatePhotoProgress(photoId, { progress: 80 });

            const uploadSuccess = azureResult.success;
            const errorMessage = uploadSuccess
              ? undefined
              : getAzureUploadErrorMessage(azureResult);

            // Confirmar subida
            if (uploadSession.photo_id) {
              console.log(
                `🔄 [PHOTO ${index + 1}] Confirming upload for photo_id:`,
                uploadSession.photo_id,
              );
              const cameraInfo = await getCameraInfo();
              const confirmData = {
                photo_id: uploadSession.photo_id,
                upload_successful: uploadSuccess,
                error_message: errorMessage,
                camera_info: cameraInfo,
              };

              console.log(
                `🔄 [PHOTO ${index + 1}] Confirmation data:`,
                confirmData,
              );

              await confirmUpload(confirmData);

              console.log(
                `✅ [PHOTO ${index + 1}] Upload confirmed successfully for ${uploadSession.photo_id}`,
              );
            } else {
              console.error(
                `❌ [PHOTO ${index + 1}] No photo_id in upload session:`,
                uploadSession,
              );
            }

            updatePhotoProgress(photoId, {
              status: uploadSuccess ? "completed" : "failed",
              progress: 100,
              error: errorMessage,
            });

            return { photoId, success: uploadSuccess };
          } catch (error) {
            console.error(
              `❌ [PHOTO ${index + 1}] Error processing photo ${photoId}:`,
              error,
            );
            updatePhotoProgress(photoId, {
              status: "failed",
              progress: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            return {
              photoId,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        },
      );

      const uploadResults = await Promise.all(uploadPromises);

      // Calcular resultados finales
      const successful = uploadResults.filter((r) => r.success).length;
      const failed = uploadResults.filter((r) => !r.success).length;
      const errors = uploadResults
        .filter((r) => !r.success)
        .map((r) => r.error || "Unknown error");

      console.log(`📊 [BULK SUMMARY] Upload completed:`, {
        successful,
        failed,
        total: photos.length,
        errors: errors.length > 0 ? errors : "None",
      });

      return {
        success: successful > 0,
        uploadedPhotos: successful,
        totalPhotos: photos.length,
        errors,
        details: uploadProgress,
      };
    } catch (error) {
      console.error("Error in bulk upload:", error);

      // Marcar todas las fotos como fallidas
      photos.forEach((photo) => {
        updatePhotoProgress(photo.id, {
          status: "failed",
          progress: 0,
          error: error instanceof Error ? error.message : "Bulk upload failed",
        });
      });

      return {
        success: false,
        uploadedPhotos: 0,
        totalPhotos: photos.length,
        errors: [error instanceof Error ? error.message : "Bulk upload failed"],
        details: uploadProgress,
      };
    }
  };

  /**
   * Función principal para subir fotos (decide entre single o bulk)
   */
  const uploadPhotos = async (
    photos: Photo[],
    physicalAdvanceId: number,
    location?: LocationData,
  ): Promise<UploadResult> => {
    if (photos.length === 0) {
      return {
        success: true,
        uploadedPhotos: 0,
        totalPhotos: 0,
        errors: [],
        details: [],
      };
    }

    setIsUploading(true);

    // Inicializar progreso
    const initialProgress: PhotoUploadProgress[] = photos.map((photo) => ({
      photoId: photo.id,
      filename: photo.filename,
      status: "pending" as const,
      progress: 0,
    }));

    setUploadProgress(initialProgress);
    onProgress?.(initialProgress);

    let result: UploadResult;

    try {
      if (photos.length === 1) {
        // Usar single upload para una foto
        const success = await uploadSinglePhoto(
          photos[0],
          physicalAdvanceId,
          location,
        );
        result = {
          success,
          uploadedPhotos: success ? 1 : 0,
          totalPhotos: 1,
          errors: success ? [] : ["Failed to upload photo"],
          details: uploadProgress,
        };
      } else {
        // Usar bulk upload para múltiples fotos
        result = await uploadMultiplePhotos(
          photos,
          physicalAdvanceId,
          location,
        );
      }

      onComplete?.(result);
      return result;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadPhotos,
    isUploading,
    uploadProgress,
  };
};

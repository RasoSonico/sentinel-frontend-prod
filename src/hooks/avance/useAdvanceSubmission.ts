import { useState } from "react";
import { submitAdvance } from "../data/api/avanceApi";
import { usePhotoUpload, UploadResult } from "./usePhotoUpload";
import { Photo } from "./usePhotoCapture";
import { LocationData } from "./useGeolocation";
import { SubmitAdvance, SubmitAvanceResponse } from "../../types/avance";

export interface AdvanceSubmissionData {
  concept: number;
  volume: number;
  comments: string;
  photos: Photo[];
  location?: LocationData;
}

export interface SubmissionProgress {
  stage:
    | "idle"
    | "submitting_advance"
    | "uploading_photos"
    | "completed"
    | "failed";
  message: string;
  advanceData?: SubmitAvanceResponse;
  photoResult?: UploadResult;
  error?: string;
}

interface UseAdvanceSubmissionProps {
  constructionId: number;
  onProgress?: (progress: SubmissionProgress) => void;
}

export const useAdvanceSubmission = ({
  constructionId,
  onProgress,
}: UseAdvanceSubmissionProps) => {
  const [submissionState, setSubmissionState] = useState<SubmissionProgress>({
    stage: "idle",
    message: "Listo para enviar",
  });

  const photoUpload = usePhotoUpload({
    constructionId,
    onProgress: (photoProgress) => {
      // Actualizar progreso cuando las fotos se están subiendo
      if (submissionState.stage === "uploading_photos") {
        const completedPhotos = photoProgress.filter(
          (p) => p.status === "completed"
        ).length;
        const totalPhotos = photoProgress.length;
        setSubmissionState((prev) => ({
          ...prev,
          message: `Subiendo fotos: ${completedPhotos}/${totalPhotos}`,
        }));
        onProgress?.({
          ...submissionState,
          message: `Subiendo fotos: ${completedPhotos}/${totalPhotos}`,
        });
      }
    },
  });

  const updateProgress = (updates: Partial<SubmissionProgress>) => {
    setSubmissionState((prev) => {
      const newState = { ...prev, ...updates };
      onProgress?.(newState);
      return newState;
    });
  };

  const submitAdvanceWithPhotos = async (
    data: AdvanceSubmissionData
  ): Promise<boolean> => {
    try {
      // Paso 1: Enviar datos del avance físico
      updateProgress({
        stage: "submitting_advance",
        message: "Enviando datos del avance...",
      });

      const advancePayload: SubmitAdvance = {
        concept: data.concept,
        volume: data.volume,
        comments: data.comments,
      };

      const advanceResponse = await submitAdvance(advancePayload);

      updateProgress({
        advanceData: advanceResponse,
        message: "Avance registrado exitosamente",
      });

      // Paso 2: Subir fotos si las hay
      if (data.photos.length > 0) {
        updateProgress({
          stage: "uploading_photos",
          message: `Preparando subida de ${data.photos.length} foto(s)...`,
        });

        const photoResult = await photoUpload.uploadPhotos(
          data.photos,
          advanceResponse.id,
          data.location
        );

        updateProgress({
          photoResult,
          message: photoResult.success
            ? `Fotos subidas exitosamente: ${photoResult.uploadedPhotos}/${photoResult.totalPhotos}`
            : `Error en subida de fotos: ${photoResult.errors.join(", ")}`,
        });

        // Si hay errores en fotos pero el avance se envió, consideramos parcialmente exitoso
        if (!photoResult.success && photoResult.uploadedPhotos === 0) {
          updateProgress({
            stage: "failed",
            message: "Avance registrado, pero falló la subida de fotos",
            error: photoResult.errors.join(", "),
          });
          return false;
        }
      }

      // Paso 3: Completado exitosamente
      updateProgress({
        stage: "completed",
        message:
          data.photos.length > 0
            ? "Avance y fotos enviados exitosamente"
            : "Avance enviado exitosamente",
      });

      return true;
    } catch (error) {
      console.error("Error in advance submission:", error);

      updateProgress({
        stage: "failed",
        message: "Error al enviar el avance",
        error: error instanceof Error ? error.message : "Error desconocido",
      });

      return false;
    }
  };

  const resetSubmission = () => {
    setSubmissionState({
      stage: "idle",
      message: "Listo para enviar",
    });
  };

  return {
    submitAdvanceWithPhotos,
    submissionState,
    isSubmitting:
      submissionState.stage === "submitting_advance" ||
      submissionState.stage === "uploading_photos",
    resetSubmission,
  };
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitAdvance } from "../data/api/avanceApi";
import { usePhotoUpload, UploadResult } from "./usePhotoUpload";
import { Photo } from "./usePhotoCapture";
import { SubmitAdvance, SubmitAvanceResponse } from "../../types/avance";
import { useAdvanceLocation } from "./useAdvanceLocation";
import { AVANCE_QUERY_KEYS } from "../data/query/avanceQueries.const";

export interface AdvanceSubmissionData {
  concept: number;
  volume: number;
  comments: string;
  photos: Photo[];
}

interface UseAdvanceSubmissionProps {
  constructionId: number;
}

export const useAdvancesSubmission = ({
  constructionId,
}: UseAdvanceSubmissionProps) => {
  const queryClient = useQueryClient();
  const photoUpload = usePhotoUpload({ constructionId });
  const { location, loading: loadingLocation } = useAdvanceLocation({
    requestPermissionOnMount: true,
  });

  const mutation = useMutation({
    mutationFn: async (data: AdvanceSubmissionData) => {
      if (loadingLocation || !location) {
        throw new Error(
          "Datos de ubicación no disponibles, por favor intente de nuevo",
        );
      }
      // Paso 1: Enviar datos del avance físico
      console.group("Submitting advance with photos");
      console.log("Submitting advance data:", data);

      const advancePayload: SubmitAdvance = {
        concept: data.concept,
        volume: data.volume,
        comments: data.comments,
      };

      let advanceResponse: SubmitAvanceResponse;
      try {
        advanceResponse = await submitAdvance(advancePayload);
        console.log("Advance submitted successfully:", advanceResponse);
      } catch (error: any) {
        console.log(
          "Error submitting advance:",
          error.message || "Unknown error",
        );
        console.groupEnd();
        throw new Error(
          "Error guardando avance físico, por favor intente de nuevo",
        );
      }

      // Paso 2: Subir fotos si las hay
      let photoResult: UploadResult | undefined;
      if (data.photos.length > 0) {
        console.log("Uploading photos:", data.photos.length);

        try {
          photoResult = await photoUpload.uploadPhotos(
            data.photos,
            advanceResponse.id,
            location,
          );
          console.log(
            "Photos uploaded successfully:",
            photoResult.uploadedPhotos,
            "out of",
            photoResult.totalPhotos,
          );
        } catch (error: any) {
          console.error(
            "Error uploading photos:",
            error.message || "Unknown error",
          );
          console.groupEnd();
          return;
        }

        if (!photoResult.success && photoResult.uploadedPhotos === 0) {
          console.log(
            "Advance submitted, but no photos uploaded due to errors",
            photoResult.errors.join(", "),
          );
        }
      }

      // Paso 3: Invalidar queries para actualizar AdvanceListScreen
      console.log("Invalidating queries to refresh AdvanceListScreen...");
      await queryClient.invalidateQueries({
        queryKey: [AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG],
      });

      // Paso 4: Completado exitosamente
      console.log("Advance and photos submitted successfully");
      console.groupEnd();
    },
  });

  return {
    submitAdvanceWithPhotos: mutation.mutateAsync,
    mutation, // contains status, data, error, isPending, etc.
  };
};

export default useAdvancesSubmission;

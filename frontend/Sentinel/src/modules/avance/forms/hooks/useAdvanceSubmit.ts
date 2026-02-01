import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";
import { useAdvanceFormContext } from "../context/AdvanceFormContext";
import { useAdvanceSubmitToQueue } from "src/hooks/avance/useAdvanceSubmitToQueue";
import { useModal } from "src/modules/modals/ModalContext";
import { Photo } from "src/hooks/avance/usePhotoCapture";

export function useAdvanceSubmit() {
  const { getValues, reset } = useFormContext<AdvanceFormFieldsZod>();
  const { constructionId, catalogs } = useAdvanceFormContext();
  const {
    submitToQueue,
    isAdding,
    pendingCount,
    failedCount,
    pendingPhotosCount,
    failedPhotosCount,
  } = useAdvanceSubmitToQueue();
  const { closeModal } = useModal();

  const onFormSubmit = useCallback(
    async (
      data: AdvanceFormFieldsZod,
      photos: Photo[] = [],
      onSuccess?: () => void
    ) => {
      const catalog = catalogs?.find((c) => c.id === data.catalog);
      const partida = catalog?.work_items.find((p) => p.id === data.partida);
      const concept = partida?.concepts.find((c) => c.id === data.concept);

      await submitToQueue(
        {
          concept: data.concept,
          quantity: data.quantity,
          notes: data.notes ?? "",
        },
        {
          catalogId: data.catalog,
          catalogName: catalog?.name ?? "",
          workItemId: data.partida,
          workItemName: partida?.name ?? "",
          conceptDescription: concept?.description ?? "",
          constructionId,
        },
        photos
      );

      closeModal();
      reset();
      onSuccess?.();
    },
    [catalogs, constructionId, submitToQueue, closeModal, reset]
  );

  const getSummary = useCallback(() => {
    const data = getValues();
    const catalog = catalogs?.find((c) => c.id === data.catalog);
    const partida = catalog?.work_items.find((p) => p.id === data.partida);
    const concept = partida?.concepts.find((c) => c.id === data.concept);

    return {
      catalog: catalog?.name ?? "",
      partida: partida?.name ?? "",
      concept: concept?.description ?? "",
      volume: data.quantity || "0",
      unit: concept?.unit ?? "",
      notes: data.notes || "",
    };
  }, [getValues, catalogs]);

  return {
    onFormSubmit,
    getSummary,
    isAdding,
    pendingCount,
    failedCount,
    pendingPhotosCount,
    failedPhotosCount,
  };
}

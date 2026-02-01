import React, { useCallback } from "react";
import { ScrollView } from "react-native";
import { useFormContext } from "react-hook-form";
import SubmitButton from "../../components/SubmitButton";
import { AdvanceFormFieldsZod } from "../util/advanceFormValidation";
import { useAdvanceFormContext } from "../context/AdvanceFormContext";
import { useAdvanceSubmit } from "../hooks/useAdvanceSubmit";
import { useModal } from "src/modules/modals/ModalContext";
import { ModalEnum } from "src/modules/modals/modalTypes";

interface SubmitSectionProps {
  scrollViewRef: React.RefObject<ScrollView | null>;
}

export function SubmitSection({ scrollViewRef }: SubmitSectionProps) {
  const { trigger, handleSubmit } = useFormContext<AdvanceFormFieldsZod>();
  const { isLoadingAvanceBase } = useAdvanceFormContext();
  const { onFormSubmit, getSummary, isAdding } = useAdvanceSubmit();
  const { openModal, closeModal } = useModal();

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  }, [scrollViewRef]);

  const handleEditConfirmSendModal = useCallback(() => {
    closeModal();
    scrollToTop();
  }, [closeModal, scrollToTop]);

  const handleConfirmSendModal = useCallback(() => {
    handleSubmit((data: AdvanceFormFieldsZod) =>
      onFormSubmit(data, scrollToTop),
    )();
  }, [handleSubmit, onFormSubmit, scrollToTop]);

  const handleSubmitForm = useCallback(async () => {
    const valid = await trigger();
    if (valid) {
      const summary = getSummary();
      openModal(ModalEnum.ConfirmSend, {
        onEdit: handleEditConfirmSendModal,
        onConfirm: handleConfirmSendModal,
        summary,
      });
    } else {
      scrollToTop();
    }
  }, [
    trigger,
    getSummary,
    openModal,
    handleEditConfirmSendModal,
    handleConfirmSendModal,
    scrollToTop,
  ]);

  return (
    <SubmitButton
      loading={isLoadingAvanceBase || isAdding}
      disabled={isLoadingAvanceBase || isAdding}
      onPress={handleSubmitForm}
    />
  );
}

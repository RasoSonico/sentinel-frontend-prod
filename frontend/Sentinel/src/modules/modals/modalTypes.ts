export enum ModalEnum {
  AdvanceSuccess = "AdvanceSuccess",
  AdvanceSent = "AdvanceSent",
  AdvancePending = "AdvancePending",
  AdvanceFailure = "AdvanceFailure",
  ConfirmSend = "ConfirmSend",
  // Generic reusable modals
  Success = "Success",
  Failure = "Failure",
  Confirm = "Confirm",
  Pending = "Pending",
}

export type ModalPropsMap = {
  // Backward compatibility for existing advance modals
  [ModalEnum.AdvanceSuccess]: import("./components/AdvanceSuccessModal").AdvanceSuccessModalProps;
  [ModalEnum.AdvanceSent]: import("./components/AdvanceSentModal").AdvanceSentModalProps;
  [ModalEnum.AdvancePending]: import("./components/AdvancePendingModal").AdvancePendingModalProps;
  [ModalEnum.AdvanceFailure]: import("./components/AdvanceFailureModal").AdvanceFailureModalProps;
  [ModalEnum.ConfirmSend]: import("./components/ConfirmSendModal").ConfirmSendModalProps;
  // Generic reusable modal props
  [ModalEnum.Success]: import("./components/AdvanceSuccessModal").SuccessModalProps;
  [ModalEnum.Failure]: import("./components/AdvanceFailureModal").FailureModalProps;
  [ModalEnum.Confirm]: import("./components/ConfirmSendModal").ConfirmModalProps;
  [ModalEnum.Pending]: import("./components/AdvancePendingModal").AdvancePendingModalProps;
};

export interface BaseModalProps {
  onClose: () => void;
}

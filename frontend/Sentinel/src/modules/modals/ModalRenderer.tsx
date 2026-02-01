import React, { Suspense } from "react";
import { ModalEnum } from "./modalTypes";

// Backward compatibility imports
const AdvanceSuccessModal = React.lazy(
  () => import("./components/AdvanceSuccessModal"),
);
const AdvanceSentModal = React.lazy(
  () => import("./components/AdvanceSentModal"),
);
const AdvanceFailureModal = React.lazy(
  () => import("./components/AdvanceFailureModal"),
);
const AdvancePendingModal = React.lazy(
  () => import("./components/AdvancePendingModal"),
);
const ConfirmSendModal = React.lazy(
  () => import("./components/ConfirmSendModal"),
);

// Generic reusable modal imports
const SuccessModal = React.lazy(() =>
  import("./components/AdvanceSuccessModal").then((module) => ({
    default: module.SuccessModal,
  })),
);
const SentModal = React.lazy(() =>
  import("./components/AdvanceSentModal").then((module) => ({
    default: module.AdvanceSentModal,
  })),
);
const FailureModal = React.lazy(() =>
  import("./components/AdvanceFailureModal").then((module) => ({
    default: module.FailureModal,
  })),
);
const ConfirmModal = React.lazy(() =>
  import("./components/ConfirmSendModal").then((module) => ({
    default: module.ConfirmModal,
  })),
);
const PendingModal = React.lazy(
  () => import("./components/AdvancePendingModal"),
);
const InfoDetailModal = React.lazy(
  () => import("./components/InfoDetailModal"),
);
const SearchablePickerModal = React.lazy(
  () => import("./components/SearchablePickerModal"),
);

const MODAL_MAP = {
  // Backward compatibility
  [ModalEnum.AdvanceSuccess]: AdvanceSuccessModal,
  [ModalEnum.AdvanceSent]: AdvanceSentModal,
  [ModalEnum.AdvancePending]: AdvancePendingModal,
  [ModalEnum.AdvanceFailure]: AdvanceFailureModal,
  [ModalEnum.ConfirmSend]: ConfirmSendModal,
  // Generic reusable modals
  [ModalEnum.Success]: SuccessModal,
  [ModalEnum.Failure]: FailureModal,
  [ModalEnum.Confirm]: ConfirmModal,
  [ModalEnum.Pending]: PendingModal,
  [ModalEnum.InfoDetail]: InfoDetailModal,
  [ModalEnum.SearchablePicker]: SearchablePickerModal,
};

export default function ModalRenderer({
  modal,
  onClose,
}: {
  modal: { type: ModalEnum | null; props: any };
  onClose: () => void;
}) {
  if (!modal.type) return null;
  const ModalComponent = MODAL_MAP[modal.type];
  if (!ModalComponent) return null;

  // Always inject onClose to allow closing from modal
  const props = { ...modal.props, onClose: onClose };

  return (
    <Suspense fallback={null}>
      <ModalComponent {...props} />
    </Suspense>
  );
}

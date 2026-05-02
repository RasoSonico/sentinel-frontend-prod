import React, { createContext, useContext, useState, ReactNode } from "react";
import { ModalEnum, ModalPropsMap } from "./modalTypes";
import ModalRenderer from "./ModalRenderer";

type ModalState = {
  type: ModalEnum | null;
  props: any;
};

type ModalContextType = {
  openModal: <T extends ModalEnum>(
    type: T,
    props?: Omit<ModalPropsMap[T], "onClose">
  ) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modal, setModal] = useState<ModalState>({ type: null, props: null });

  const openModal = (type: ModalEnum, props?: any) => {
    setModal({ type, props });
  };

  const closeModal = () => {
    setModal({ type: null, props: null });
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <ModalRenderer modal={modal} onClose={closeModal} />
    </ModalContext.Provider>
  );
};

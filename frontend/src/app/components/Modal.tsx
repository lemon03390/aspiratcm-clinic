"use client";
import { useEffect, useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: "blue" | "red" | "green" | "yellow" | "gray";
  width?: "sm" | "md" | "lg" | "xl";
  children?: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "確認",
  cancelText = "取消",
  confirmButtonColor = "blue",
  width = "md",
  children,
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // 等待動畫完成
  };

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(onConfirm, 300); // 等待動畫完成
  };

  if (!isOpen) {
    return null;
  }

  const getButtonColor = () => {
    switch (confirmButtonColor) {
      case "red":
        return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
      case "green":
        return "bg-green-600 hover:bg-green-700 focus:ring-green-500";
      case "yellow":
        return "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500";
      case "gray":
        return "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500";
      case "blue":
      default:
        return "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
    }
  };

  const getWidthClass = () => {
    switch (width) {
      case "sm":
        return "max-w-sm";
      case "lg":
        return "max-w-lg";
      case "xl":
        return "max-w-xl";
      case "md":
      default:
        return "max-w-md";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999999] overflow-y-auto"
      aria-labelledby={title}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        {/* 背景暗化層 */}
        <div
          className={`fixed inset-0 bg-gray-500 transition-opacity duration-300 ${isVisible ? "bg-opacity-75" : "bg-opacity-0"}`}
          aria-hidden="true"
          onClick={handleClose}
        ></div>

        {/* 模態框 */}
        <div
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ${getWidthClass()} ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3
                  className="text-lg leading-6 font-medium text-gray-900"
                  id="modal-title"
                >
                  {title}
                </h3>
                <div className="mt-2">
                  {children ? (
                    children
                  ) : (
                    <p className="text-sm text-gray-500">{message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${getButtonColor()}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={handleClose}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using confirm dialog
export function useConfirm() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmButtonColor?: "blue" | "red" | "green" | "yellow" | "gray";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      confirmButtonColor?: "blue" | "red" | "green" | "yellow" | "gray";
    },
  ) => {
    setState({
      isOpen: true,
      title,
      message,
      onConfirm,
      ...options,
    });
  };

  const handleClose = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const ConfirmDialog = () => (
    <Modal
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={state.onConfirm}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      confirmButtonColor={state.confirmButtonColor}
    />
  );

  return { confirm, ConfirmDialog };
}

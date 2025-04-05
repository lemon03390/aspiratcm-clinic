"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: "success" | "error" | "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      // 自動移除toast
      setTimeout(() => {
        removeToast(id);
      }, 3000);
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string) => {
      addToast(message, "success");
    },
    [addToast],
  );

  const error = useCallback(
    (message: string) => {
      addToast(message, "error");
    },
    [addToast],
  );

  const info = useCallback(
    (message: string) => {
      addToast(message, "info");
    },
    [addToast],
  );

  const ToastContainer = useCallback(() => {
    return (
      <div className="fixed bottom-4 right-4 z-[999999] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-md shadow-lg flex items-center ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : toast.type === "error"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }, [toasts, removeToast]);

  return { ToastContainer, success, error, info };
}

'use client';

import { Toast, ToastProps } from './Toast';

export interface ToastData {
  id: string;
  type: ToastProps['type'];
  message: string;
  duration?: number;
}

export interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  // Limit to max 3 toasts visible at once
  const visibleToasts = toasts.slice(-3);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed right-0 top-0 z-50 flex w-full flex-col items-end gap-2 p-4 sm:p-6"
      aria-live="polite"
      aria-atomic="false"
    >
      {visibleToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={onRemove}
          />
        </div>
      ))}
    </div>
  );
}

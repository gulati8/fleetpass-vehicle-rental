import { forwardRef, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ModalProps,
  type ModalHeaderProps,
  type ModalTitleProps,
  type ModalDescriptionProps,
  type ModalBodyProps,
  type ModalFooterProps,
} from './Modal.types';

export function Modal({ isOpen, onClose, children, size = 'md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus trap
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[
      focusableElements.length - 1
    ] as HTMLElement;

    firstElement?.focus();

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative z-10 bg-white rounded-2xl shadow-xl',
          'animate-scale-in',
          'w-full',
          sizeClasses[size]
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between p-6 pb-4', className)}
        {...props}
      >
        <div className="flex-1">{children}</div>
      </div>
    );
  }
);
ModalHeader.displayName = 'ModalHeader';

export const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn('text-xl font-semibold text-neutral-900', className)}
        {...props}
      />
    );
  }
);
ModalTitle.displayName = 'ModalTitle';

export const ModalDescription = forwardRef<
  HTMLParagraphElement,
  ModalDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-neutral-600 mt-1', className)}
      {...props}
    />
  );
});
ModalDescription.displayName = 'ModalDescription';

export const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
    );
  }
);
ModalBody.displayName = 'ModalBody';

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-end gap-3 p-6 pt-4 bg-neutral-50 rounded-b-2xl',
          className
        )}
        {...props}
      />
    );
  }
);
ModalFooter.displayName = 'ModalFooter';

// Close button component for convenience
export function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="rounded-lg p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
      aria-label="Close modal"
    >
      <X className="h-5 w-5" />
    </button>
  );
}

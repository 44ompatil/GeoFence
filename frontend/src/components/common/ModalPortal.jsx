import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Viewport-level Modal Portal wrapper.
 * Renders modal directly into document.body to prevent parent transforms,
 * scrolling containers, or stacking contexts from displacing fixed modals.
 *
 * Automatically manages body scroll lock and keyboard ESC dismissal.
 */
export default function ModalPortal({
  isOpen,
  onClose,
  children,
  closeOnBackdrop = true,
  closeOnEsc = true,
  maxWidthClass = 'max-w-md',
}) {
  // Lock body scrolling while modal is active without jumping or losing scroll position
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Compensate for scrollbar width to prevent layout shifts
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEsc]);

  if (!isOpen) return null;

  const handleContainerClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleContainerClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* 1. Viewport-level backdrop overlay (Layered below modal card) */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in pointer-events-auto"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* 2. Truly Viewport-Centered Modal Container */}
      <div
        className={`relative z-10 w-full ${maxWidthClass} max-h-[calc(100vh-2.5rem)] flex flex-col my-auto pointer-events-auto animate-modal-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

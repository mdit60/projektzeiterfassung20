'use client';

// src/components/shared/Modal.tsx
// ============================================================================
// PZE V7 - Gemeinsame Modal-Komponente
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
//
// Wiederverwendbare Modal-Komponente fuer:
// - Bearbeiten-Dialoge
// - Loeschen-Bestaetigungen
// - Info-Dialoge
// - Formulare
// ============================================================================

import { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

import { V7PortalType } from '@/types/v7-types';
import { PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ModalVariant = 'default' | 'danger' | 'success' | 'warning' | 'info';

interface ModalProps {
  portal: V7PortalType;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
  variant?: ModalVariant;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
}

interface ConfirmModalProps {
  portal: V7PortalType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

const VARIANT_ICONS: Record<ModalVariant, React.ReactNode> = {
  default: null,
  danger: <XCircle className="text-red-500" size={24} />,
  success: <CheckCircle className="text-green-500" size={24} />,
  warning: <AlertTriangle className="text-yellow-500" size={24} />,
  info: <Info className="text-blue-500" size={24} />,
};

const VARIANT_HEADER_CLASSES: Record<ModalVariant, string> = {
  default: 'border-b border-gray-200',
  danger: 'border-b border-red-200 bg-red-50',
  success: 'border-b border-green-200 bg-green-50',
  warning: 'border-b border-yellow-200 bg-yellow-50',
  info: 'border-b border-blue-200 bg-blue-50',
};

// ============================================================================
// HAUPT-MODAL KOMPONENTE
// ============================================================================

export default function Modal({
  portal,
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const colors = PORTAL_COLORS[portal];

  // ESC-Taste zum Schliessen
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Body-Scroll verhindern wenn Modal offen
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fokus-Trap (vereinfacht)
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          relative bg-white rounded-lg shadow-xl w-full mx-4
          ${SIZE_CLASSES[size]}
          transform transition-all
          animate-in fade-in zoom-in-95 duration-200
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${VARIANT_HEADER_CLASSES[variant]}`}>
          <div className="flex items-center gap-3">
            {VARIANT_ICONS[variant]}
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100
                         transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CONFIRM-MODAL KOMPONENTE
// ============================================================================

export function ConfirmModal({
  portal,
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Bestaetigen',
  cancelText = 'Abbrechen',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const colors = PORTAL_COLORS[portal];

  const buttonVariantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: `bg-sky-600 hover:bg-sky-700 focus:ring-sky-500`,
  };

  return (
    <Modal
      portal={portal}
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      size="sm"
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300
                       rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2
                       focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`
              px-4 py-2 text-sm font-medium text-white rounded-md
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
              ${buttonVariantClasses[variant]}
            `}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      }
    >
      <div className="text-sm text-gray-600">
        {typeof message === 'string' ? <p>{message}</p> : message}
      </div>
    </Modal>
  );
}

// ============================================================================
// DELETE-CONFIRM MODAL (Spezialisiert)
// ============================================================================

interface DeleteConfirmModalProps {
  portal: V7PortalType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemType: string;        // z.B. "Mitarbeiter", "Projekt"
  itemName: string;        // z.B. "Max Mueller", "Smarte Sensortechnik"
  loading?: boolean;
}

export function DeleteConfirmModal({
  portal,
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName,
  loading = false,
}: DeleteConfirmModalProps) {
  return (
    <ConfirmModal
      portal={portal}
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`${itemType} loeschen`}
      message={
        <p>
          Moechten Sie <strong>{itemName}</strong> wirklich loeschen?
          <br />
          <span className="text-red-600 mt-2 block">
            Diese Aktion kann nicht rueckgaengig gemacht werden.
          </span>
        </p>
      }
      confirmText="Loeschen"
      cancelText="Abbrechen"
      variant="danger"
      loading={loading}
    />
  );
}

// ============================================================================
// FORM-MODAL KOMPONENTE (Fuer Bearbeiten-Dialoge)
// ============================================================================

interface FormModalProps {
  portal: V7PortalType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  submitDisabled?: boolean;
}

export function FormModal({
  portal,
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  size = 'lg',
  submitText = 'Speichern',
  cancelText = 'Abbrechen',
  loading = false,
  submitDisabled = false,
}: FormModalProps) {
  const colors = PORTAL_COLORS[portal];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Modal
      portal={portal}
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300
                       rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2
                       focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            form="modal-form"
            disabled={loading || submitDisabled}
            className="px-4 py-2 text-sm font-medium text-white rounded-md
                       focus:outline-none focus:ring-2 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            style={{ backgroundColor: colors.primary }}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {submitText}
          </button>
        </div>
      }
    >
      <form id="modal-form" onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  );
}

// ============================================================================
// ENDE
// ============================================================================

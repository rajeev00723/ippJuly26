import React from 'react';
import { tokens } from '../tokens';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  maxHeight?: number | string;
  title?: string;
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, children, className, style, width = 700, maxHeight = 600, title }, ref) => {
    React.useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          ref={ref}
          className={className}
          style={{
            background: tokens.color.css.surface,
            borderRadius: tokens.radius.card,
            boxShadow: tokens.color.css.shadowHover,
            width: typeof width === 'number' ? `${width}px` : width,
            maxWidth: '90vw',
            maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
            overflowY: 'auto',
            border: `1px solid ${tokens.color.css.hairline}`,
            ...style,
          }}
        >
          {children}
        </div>
      </div>
    );
  },
);

Modal.displayName = 'Modal';

import React from 'react';
import { tokens } from '../tokens';

export interface IconButtonProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
  size?: 'sm' | 'md';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, style, onClick, disabled, title, size = 'md' }, ref) => {
    const dim = size === 'sm' ? 28 : 36;
    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: dim,
          height: dim,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: tokens.color.css.textSecondary,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: `background ${tokens.motion.duration} ${tokens.motion.standard}`,
          outline: 'none',
          padding: 0,
          ...style,
        }}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

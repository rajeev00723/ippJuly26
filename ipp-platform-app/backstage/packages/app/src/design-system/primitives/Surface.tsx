import React from 'react';
import { tokens } from '../tokens';

export interface SurfaceProps {
  variant?: 'default' | 'alt' | 'elevated';
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: number | string;
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ variant = 'default', children, className, style, padding }, ref) => {
    const bgMap = {
      default:  tokens.color.css.surface,
      alt:      tokens.color.css.surfaceAlt,
      elevated: tokens.color.css.surface,
    };

    const paddingVal = padding !== undefined
      ? (typeof padding === 'number' ? `${padding * 8}px` : padding)
      : '0';

    return (
      <div
        ref={ref}
        className={className}
        style={{
          background: bgMap[variant],
          border: `1px solid ${tokens.color.css.hairline}`,
          borderRadius: tokens.radius.card,
          boxShadow: variant === 'elevated' ? tokens.color.css.shadowHover : tokens.color.css.shadowResting,
          padding: paddingVal,
          ...style,
        }}
      >
        {children}
      </div>
    );
  },
);

Surface.displayName = 'Surface';

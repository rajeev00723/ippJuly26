import React from 'react';
import { tokens } from '../tokens';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
  spacing?: number;
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ orientation = 'horizontal', className, style, spacing = 0 }, ref) => {
    const isV = orientation === 'vertical';
    return (
      <div
        ref={ref}
        className={className}
        role="separator"
        aria-orientation={orientation}
        style={{
          flexShrink: 0,
          ...(isV
            ? { width: '1px', height: '100%', background: tokens.color.css.hairline, margin: `0 ${spacing * 8}px` }
            : { height: '1px', width: '100%', background: tokens.color.css.hairline, margin: `${spacing * 8}px 0` }),
          ...style,
        }}
      />
    );
  },
);

Divider.displayName = 'Divider';

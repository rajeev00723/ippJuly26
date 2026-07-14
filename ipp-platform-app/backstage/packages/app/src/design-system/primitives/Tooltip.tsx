import React from 'react';
import { tokens } from '../tokens';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, children, placement = 'top', className, style }, ref) => {
    const [visible, setVisible] = React.useState(false);

    const placementStyle: React.CSSProperties =
      placement === 'top'    ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }
      : placement === 'bottom' ? { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }
      : placement === 'left'   ? { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }
      :                          { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' };

    return (
      <div
        ref={ref}
        className={className}
        style={{ position: 'relative', display: 'inline-flex', ...style }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        {children}
        {visible && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              ...placementStyle,
              background: tokens.color.css.textPrimary,
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: 1.4,
              padding: '6px 10px',
              borderRadius: tokens.radius.inner,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 9999,
              fontFamily: tokens.font.sans,
              boxShadow: tokens.color.css.shadowHover,
            }}
          >
            {content}
          </div>
        )}
      </div>
    );
  },
);

Tooltip.displayName = 'Tooltip';

import React from 'react';
import { tokens, dhl } from '../tokens';

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: number | string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  hoverable?: boolean;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, style, padding = 3, onClick, hoverable = false, title, subtitle, action }, ref) => {
    const [hovered, setHovered] = React.useState(false);
    const paddingVal = typeof padding === 'number' ? `${padding * 8}px` : padding;
    const isInteractive = hoverable || !!onClick;

    return (
      <div
        ref={ref}
        className={className}
        onClick={onClick}
        onMouseEnter={() => isInteractive && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: tokens.color.css.surface,
          border: `1px solid ${hovered && isInteractive ? dhl.yellow : tokens.color.css.hairline}`,
          borderRadius: tokens.radius.card,
          boxShadow: hovered && isInteractive ? tokens.shadow.hover : tokens.shadow.resting,
          padding: paddingVal,
          transition: `transform ${tokens.motion.duration} ${tokens.motion.standard}, box-shadow ${tokens.motion.duration} ${tokens.motion.standard}, border-color ${tokens.motion.duration} ${tokens.motion.standard}`,
          cursor: onClick ? 'pointer' : 'default',
          transform: hovered && isInteractive ? 'translateY(-2px)' : 'none',
          ...style,
        }}
      >
        {(title || subtitle || action) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: children ? '16px' : 0 }}>
            <div>
              {title && (
                <p style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '-0.015em',
                  color: tokens.color.css.textPrimary,
                  fontFamily: tokens.font.sans,
                }}>
                  {title}
                </p>
              )}
              {subtitle && (
                <p style={{
                  margin: '2px 0 0',
                  fontSize: '13px',
                  color: tokens.color.css.textSecondary,
                  fontFamily: tokens.font.sans,
                }}>
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div style={{ flexShrink: 0 }}>{action}</div>}
          </div>
        )}
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

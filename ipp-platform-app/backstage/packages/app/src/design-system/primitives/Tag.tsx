import React from 'react';
import { tokens } from '../tokens';

type TagColor = 'default' | 'success' | 'warn' | 'error' | 'info' | 'neutral';

export interface TagProps {
  children?: React.ReactNode;
  color?: TagColor;
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_MAP: Record<TagColor, { bg: string; text: string; border: string }> = {
  default: { bg: tokens.color.css.surfaceAlt, text: tokens.color.css.textSecondary, border: tokens.color.css.hairline },
  success: { bg: '#f0fdf4', text: '#15803d', border: 'rgba(34,197,94,0.2)' },
  warn:    { bg: '#fffbeb', text: '#d97706', border: 'rgba(245,158,11,0.2)' },
  error:   { bg: 'rgba(212,5,17,0.07)', text: '#D40511', border: 'rgba(212,5,17,0.22)' },
  info:    { bg: 'rgba(212,5,17,0.06)', text: '#D40511', border: 'rgba(212,5,17,0.18)' },
  neutral: { bg: tokens.color.css.surfaceAlt, text: tokens.color.css.textTertiary, border: tokens.color.css.hairline },
};

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ children, color = 'default', className, style }, ref) => {
    const { bg, text, border } = COLOR_MAP[color];
    return (
      <span
        ref={ref}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 10px',
          borderRadius: '980px',
          fontSize: '12px',
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: '0.01em',
          fontFamily: tokens.font.sans,
          background: bg,
          color: text,
          border: `1px solid ${border}`,
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        {children}
      </span>
    );
  },
);

Tag.displayName = 'Tag';

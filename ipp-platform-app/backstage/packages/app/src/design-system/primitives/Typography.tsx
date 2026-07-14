import React from 'react';
import { tokens } from '../tokens';

type TypographyVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'eyebrow';

export interface TypographyProps {
  variant?: TypographyVariant;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  as?: keyof JSX.IntrinsicElements;
  id?: string;
}

const VARIANT_STYLES: Record<TypographyVariant, React.CSSProperties> = {
  display: {
    fontSize: tokens.type.heroSize,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.05,
    fontFamily: tokens.font.sans,
    color: tokens.color.css.textPrimary,
  },
  h1: {
    fontSize: tokens.type.h1Size,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
    fontFamily: tokens.font.sans,
    color: tokens.color.css.textPrimary,
  },
  h2: {
    fontSize: tokens.type.h2Size,
    fontWeight: 600,
    letterSpacing: '-0.015em',
    lineHeight: 1.2,
    fontFamily: tokens.font.sans,
    color: tokens.color.css.textPrimary,
  },
  h3: {
    fontSize: tokens.type.h3Size,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
    fontFamily: tokens.font.sans,
    color: tokens.color.css.textPrimary,
  },
  body: {
    fontSize: tokens.type.bodySize,
    fontWeight: 400,
    letterSpacing: '-0.005em',
    lineHeight: 1.47,
    fontFamily: tokens.font.sans,
    color: tokens.color.css.textPrimary,
  },
  small: {
    fontSize: tokens.type.smallSize,
    fontWeight: 400,
    letterSpacing: '0',
    lineHeight: 1.5,
    fontFamily: tokens.font.sans,
    color: tokens.color.css.textSecondary,
  },
  eyebrow: {
    fontSize: tokens.type.eyebrowSize,
    fontWeight: 600,
    letterSpacing: '0.08em',
    lineHeight: 1.4,
    textTransform: 'uppercase' as const,
    fontFamily: tokens.font.sans,
    color: tokens.color.css.textSecondary,
  },
};

const VARIANT_ELEMENTS: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  small: 'p',
  eyebrow: 'p',
};

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ variant = 'body', children, className, style, color, as, id }, ref) => {
    const Tag = (as ?? VARIANT_ELEMENTS[variant]) as any;
    const variantStyle = VARIANT_STYLES[variant];
    return (
      <Tag
        ref={ref}
        id={id}
        className={className}
        style={{ ...variantStyle, ...(color ? { color } : {}), ...style }}
      >
        {children}
      </Tag>
    );
  },
);

Typography.displayName = 'Typography';

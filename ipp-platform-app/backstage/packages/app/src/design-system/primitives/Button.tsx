import React from 'react';
import { tokens, dhl } from '../tokens';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  as?: 'button' | 'a';
  href?: string;
  target?: string;
  rel?: string;
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  primary: {
    background: dhl.black,
    color: '#ffffff',
    border: `1.5px solid ${dhl.black}`,
  },
  secondary: {
    background: tokens.color.css.surface,
    color: tokens.color.css.textPrimary,
    border: `1.5px solid ${tokens.color.css.hairline}`,
  },
  ghost: {
    background: 'transparent',
    color: tokens.color.css.textSecondary,
    border: '1.5px solid transparent',
  },
  danger: {
    background: dhl.red,
    color: '#ffffff',
    border: `1.5px solid ${dhl.red}`,
  },
};

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  sm: { fontSize: '12px', fontWeight: 600, padding: '6px 14px', height: '30px' },
  md: { fontSize: '14px', fontWeight: 600, padding: '9px 18px', height: '38px' },
};

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, className, style, onClick, disabled, type = 'button', as = 'button', href, target, rel }, ref) => {
    const [pressed, setPressed] = React.useState(false);

    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      borderRadius: tokens.radius.button,
      fontFamily: tokens.font.sans,
      letterSpacing: '-0.005em',
      lineHeight: 1,
      textDecoration: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: `opacity ${tokens.motion.duration} ${tokens.motion.standard}, background ${tokens.motion.duration} ${tokens.motion.standard}, transform 100ms ease, box-shadow 150ms ease`,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      outline: 'none',
      transform: pressed ? 'scale(0.97)' : 'scale(1)',
    };

    const combined = { ...base, ...VARIANT_STYLES[variant], ...SIZE_STYLES[size], ...style };

    if (as === 'a') {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={rel}
          className={className}
          style={combined}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={className}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        style={combined}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

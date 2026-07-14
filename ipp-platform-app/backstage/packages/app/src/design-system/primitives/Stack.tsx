import React from 'react';

export interface StackProps {
  direction?: 'row' | 'column';
  gap?: number | string;
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
  wrap?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

export const Stack = React.forwardRef<HTMLElement, StackProps>(
  ({ direction = 'column', gap = 0, align = 'stretch', justify = 'flex-start', wrap = false, children, className, style, as = 'div' }, ref) => {
    const Tag = as as any;
    return (
      <Tag
        ref={ref}
        className={className}
        style={{
          display: 'flex',
          flexDirection: direction,
          gap: typeof gap === 'number' ? `${gap * 8}px` : gap,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          ...style,
        }}
      >
        {children}
      </Tag>
    );
  },
);

Stack.displayName = 'Stack';

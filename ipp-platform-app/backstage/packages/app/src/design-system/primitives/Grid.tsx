import React from 'react';

export interface GridProps {
  cols?: number;
  gap?: number | string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  minColWidth?: string;
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ cols, gap = 2, children, className, style, minColWidth }, ref) => {
    const gapVal = typeof gap === 'number' ? `${gap * 8}px` : gap;
    const gridTemplate = minColWidth
      ? `repeat(auto-fill, minmax(${minColWidth}, 1fr))`
      : cols
      ? `repeat(${cols}, 1fr)`
      : 'repeat(12, 1fr)';

    return (
      <div
        ref={ref}
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          gap: gapVal,
          width: '100%',
          ...style,
        }}
      >
        {children}
      </div>
    );
  },
);

Grid.displayName = 'Grid';

export interface GridItemProps {
  span?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ span = 1, children, className, style }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{ gridColumn: `span ${span}`, ...style }}
    >
      {children}
    </div>
  ),
);

GridItem.displayName = 'GridItem';

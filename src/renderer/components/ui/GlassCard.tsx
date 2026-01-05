/**
 * GlassCard Component
 *
 * A translucent card with Apple's Liquid Glass aesthetic.
 * Adapts to underlying content with real-time blur and subtle highlights.
 *
 * Design Philosophy:
 * - Surfaces float above content, creating depth hierarchy
 * - Soft edges and luminosity convey information importance
 * - Hover states provide tactile feedback without distraction
 */

import React, { forwardRef } from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card variant affecting opacity and blur */
  variant?: 'default' | 'light' | 'frosted' | 'primary' | 'success' | 'warning' | 'danger';
  /** Optional header content */
  header?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Whether the card is interactive (shows hover effects) */
  interactive?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether the card is in a loading state */
  loading?: boolean;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
};

const variantClasses = {
  default: 'glass-card',
  light: 'glass-card glass-light',
  frosted: 'glass-card glass-frosted',
  primary: 'glass-card glass-primary',
  success: 'glass-card glass-success',
  warning: 'glass-card glass-warning',
  danger: 'glass-card glass-danger',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      variant = 'default',
      header,
      footer,
      interactive = false,
      padding = 'md',
      loading = false,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const baseClasses = variantClasses[variant];
    const paddingClass = paddingMap[padding];
    const interactiveClass = interactive ? 'cursor-pointer' : '';
    const loadingClass = loading ? 'animate-pulse' : '';

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${paddingClass} ${interactiveClass} ${loadingClass} ${className}`}
        style={style}
        {...props}
      >
        {header && (
          <div className="glass-card-header">
            {typeof header === 'string' ? (
              <h3 className="glass-card-title">{header}</h3>
            ) : (
              header
            )}
          </div>
        )}

        <div className="glass-card-body">{children}</div>

        {footer && <div className="glass-card-footer">{footer}</div>}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

/**
 * GlassCardHeader - Standalone header for custom card layouts
 */
export const GlassCardHeader: React.FC<{
  title?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, action, children }) => (
  <div className="glass-card-header">
    {title && <h3 className="glass-card-title">{title}</h3>}
    {children}
    {action && <div className="ml-auto">{action}</div>}
  </div>
);

/**
 * GlassCardBody - Body wrapper with proper spacing
 */
export const GlassCardBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`glass-card-body ${className}`}>{children}</div>
);

/**
 * GlassCardFooter - Footer with action button alignment
 */
export const GlassCardFooter: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
}> = ({ children, align = 'right' }) => {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  }[align];

  return <div className={`glass-card-footer ${alignClass}`}>{children}</div>;
};

export default GlassCard;

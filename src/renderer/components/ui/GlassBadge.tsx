/**
 * GlassBadge Component
 *
 * Status indicators and tags with Liquid Glass aesthetic.
 * Used for mastery stages, status labels, and categorical tags.
 *
 * Design Philosophy:
 * - Badges are lightweight glass pills
 * - Color conveys meaning without overwhelming
 * - Mastery stages use semantic color progression
 */

import React from 'react';

export interface GlassBadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Badge variant for different contexts */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Mastery stage (0-4) - overrides variant */
  masteryStage?: 0 | 1 | 2 | 3 | 4;
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Optional icon before text */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantClasses = {
  default: 'glass-badge',
  primary: 'glass-badge glass-badge-primary',
  success: 'glass-badge glass-badge-success',
  warning: 'glass-badge glass-badge-warning',
  danger: 'glass-badge glass-badge-danger',
};

const masteryClasses = {
  0: 'glass-badge glass-badge-mastery-0',
  1: 'glass-badge glass-badge-mastery-1',
  2: 'glass-badge glass-badge-mastery-2',
  3: 'glass-badge glass-badge-mastery-3',
  4: 'glass-badge glass-badge-mastery-4',
};

const masteryLabels = {
  0: 'Unknown',
  1: 'Recognition',
  2: 'Recall',
  3: 'Controlled',
  4: 'Automatic',
};

const sizeClasses = {
  sm: 'text-xs py-0.5 px-2',
  md: 'text-xs py-1 px-2.5',
  lg: 'text-sm py-1.5 px-3',
};

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'default',
  masteryStage,
  size = 'md',
  icon,
  className = '',
}) => {
  const baseClass = masteryStage !== undefined
    ? masteryClasses[masteryStage]
    : variantClasses[variant];
  const sizeClass = sizeClasses[size];

  return (
    <span className={`${baseClass} ${sizeClass} ${className}`}>
      {icon && <span className="badge-icon mr-1">{icon}</span>}
      {children}
    </span>
  );
};

/**
 * MasteryBadge - Convenience component for mastery stage display
 */
export const MasteryBadge: React.FC<{
  stage: 0 | 1 | 2 | 3 | 4;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ stage, showLabel = true, size = 'md', className = '' }) => {
  const icons = {
    0: '○',  // Empty circle
    1: '◔',  // Quarter
    2: '◑',  // Half
    3: '◕',  // Three quarters
    4: '●',  // Full
  };

  return (
    <GlassBadge
      masteryStage={stage}
      size={size}
      icon={<span aria-hidden="true">{icons[stage]}</span>}
      className={className}
    >
      {showLabel ? masteryLabels[stage] : `Stage ${stage}`}
    </GlassBadge>
  );
};

/**
 * StatusBadge - For session/item status indication
 */
export const StatusBadge: React.FC<{
  status: 'new' | 'learning' | 'review' | 'due' | 'mastered';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ status, size = 'md', className = '' }) => {
  const statusConfig = {
    new: { variant: 'default' as const, label: 'New', icon: '✦' },
    learning: { variant: 'primary' as const, label: 'Learning', icon: '◐' },
    review: { variant: 'warning' as const, label: 'Review', icon: '↻' },
    due: { variant: 'danger' as const, label: 'Due', icon: '!' },
    mastered: { variant: 'success' as const, label: 'Mastered', icon: '✓' },
  };

  const config = statusConfig[status];

  return (
    <GlassBadge
      variant={config.variant}
      size={size}
      icon={<span aria-hidden="true">{config.icon}</span>}
      className={className}
    >
      {config.label}
    </GlassBadge>
  );
};

/**
 * ComponentBadge - For linguistic component indication (PHON, MORPH, etc.)
 */
export const ComponentBadge: React.FC<{
  component: 'PHON' | 'MORPH' | 'LEX' | 'SYNT' | 'PRAG';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ component, size = 'sm', className = '' }) => {
  const componentConfig = {
    PHON: { label: 'Phonology', color: 'primary' as const },
    MORPH: { label: 'Morphology', color: 'primary' as const },
    LEX: { label: 'Lexicon', color: 'warning' as const },
    SYNT: { label: 'Syntax', color: 'danger' as const },
    PRAG: { label: 'Pragmatics', color: 'success' as const },
  };

  const config = componentConfig[component];

  return (
    <GlassBadge variant={config.color} size={size} className={className}>
      {component}
    </GlassBadge>
  );
};

export default GlassBadge;

/**
 * GoalCard Component
 *
 * Displays a learning goal with progress visualization.
 * Used in goal selection and dashboard views.
 *
 * Design Philosophy:
 * - Cards represent tangible learning objectives
 * - Progress visualization shows journey, not just numbers
 * - Language flag/icon creates quick visual identification
 * - Hover states invite interaction without distraction
 */

import React from 'react';
import { GlassCard, GlassButton, MasteryProgress, CircularProgress, GlassBadge } from '../ui';

// ============================================================================
// Types
// ============================================================================

export type Domain = 'medical' | 'legal' | 'business' | 'academic' | 'general';
export type Modality = 'reading' | 'listening' | 'writing' | 'speaking';

export interface GoalData {
  id: string;
  domain: Domain;
  modality: Modality[];
  genre: string;
  purpose: string;
  benchmark?: string;
  deadline?: Date;
  completionPercent: number;
  isActive: boolean;
  /** Statistics */
  stats?: {
    totalObjects: number;
    masteredCount: number;
    learningCount: number;
    dueCount: number;
    averageAccuracy: number;
    streak: number;
  };
}

export interface GoalCardProps {
  /** Goal data */
  goal: GoalData;
  /** Whether this goal is currently selected */
  selected?: boolean;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback for edit action */
  onEdit?: () => void;
  /** Callback for delete action */
  onDelete?: () => void;
  /** Display variant */
  variant?: 'default' | 'compact' | 'expanded';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Domain Icons
// ============================================================================

const domainIcons: Record<Domain, string> = {
  general: '📚',
  medical: '🏥',
  legal: '⚖️',
  business: '💼',
  academic: '🎓',
};

const domainLabels: Record<Domain, string> = {
  general: 'General',
  medical: 'Medical',
  legal: 'Legal',
  business: 'Business',
  academic: 'Academic',
};

const getDomainDisplay = (domain: Domain): { icon: string; label: string } => {
  return {
    icon: domainIcons[domain] || '📚',
    label: domainLabels[domain] || domain,
  };
};

// ============================================================================
// GoalCard Component
// ============================================================================

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  selected = false,
  onClick,
  onEdit,
  onDelete,
  variant = 'default',
  className = '',
}) => {
  const domainDisplay = getDomainDisplay(goal.domain);
  const stats = goal.stats;

  const masteryPercentage = stats
    ? Math.round((stats.masteredCount / Math.max(stats.totalObjects, 1)) * 100)
    : 0;

  if (variant === 'compact') {
    return (
      <GlassCard
        variant={selected ? 'primary' : 'default'}
        padding="sm"
        interactive
        onClick={onClick}
        className={`goal-card goal-card--compact ${className}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label={domainDisplay.label}>
            {domainDisplay.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{goal.genre}</h4>
            <p className="text-sm text-muted truncate">{domainDisplay.label}</p>
          </div>
          {stats && (
            <CircularProgress
              value={masteryPercentage}
              size={40}
              strokeWidth={4}
              variant="primary"
              showLabel={false}
            >
              <span className="text-xs font-medium">{masteryPercentage}%</span>
            </CircularProgress>
          )}
        </div>
      </GlassCard>
    );
  }

  if (variant === 'expanded') {
    return (
      <GlassCard
        variant={selected ? 'primary' : 'default'}
        className={`goal-card goal-card--expanded ${className}`}
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label={domainDisplay.label}>
                {domainDisplay.icon}
              </span>
              <div>
                <h3 className="text-xl font-semibold">{goal.genre}</h3>
                <p className="text-sm text-muted">{domainDisplay.label} | {goal.modality.join(', ')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <GlassButton variant="ghost" size="sm" onClick={onEdit}>
                  Edit
                </GlassButton>
              )}
              {onDelete && (
                <GlassButton variant="ghost" size="sm" onClick={onDelete}>
                  Delete
                </GlassButton>
              )}
            </div>
          </div>
        }
        footer={
          <div className="flex gap-2">
            <GlassButton variant="primary" onClick={onClick}>
              Start Learning
            </GlassButton>
            <GlassButton variant="ghost" onClick={onClick}>
              View Progress
            </GlassButton>
          </div>
        }
      >
        {goal.purpose && (
          <p className="text-muted mb-4">{goal.purpose}{goal.benchmark ? ` (${goal.benchmark})` : ''}</p>
        )}

        {stats && (
          <div className="goal-stats grid grid-cols-2 gap-4">
            <div className="stat-item">
              <span className="stat-value">{stats.totalObjects}</span>
              <span className="stat-label">Total Items</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.masteredCount}</span>
              <span className="stat-label">Mastered</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.dueCount}</span>
              <span className="stat-label">Due Today</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.streak}</span>
              <span className="stat-label">Day Streak</span>
            </div>
          </div>
        )}

        <style>{`
          .goal-stats {
            margin-top: var(--space-4);
            padding-top: var(--space-4);
            border-top: 1px solid hsl(var(--glass-border));
          }

          .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: var(--space-3);
            background: hsl(var(--glass-tint-light) / 0.5);
            border-radius: var(--radius-lg);
          }

          .stat-value {
            font-size: var(--text-2xl);
            font-weight: var(--font-bold);
            color: hsl(var(--color-neutral-900));
          }

          .stat-label {
            font-size: var(--text-xs);
            color: hsl(var(--color-neutral-500));
            text-transform: uppercase;
            letter-spacing: var(--tracking-wide);
          }
        `}</style>
      </GlassCard>
    );
  }

  // Default variant
  return (
    <GlassCard
      variant={selected ? 'primary' : 'default'}
      padding="md"
      interactive
      onClick={onClick}
      className={`goal-card ${className}`}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl" role="img" aria-label={domainDisplay.label}>
          {domainDisplay.icon}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold truncate">{goal.genre}</h4>
            {!goal.isActive && (
              <GlassBadge variant="default" size="sm">
                Inactive
              </GlassBadge>
            )}
          </div>
          <p className="text-sm text-muted mb-3">
            {domainDisplay.label} | {goal.modality.join(', ')}
          </p>

          {stats && (
            <>
              <MasteryProgress
                stage={Math.min(4, Math.floor(masteryPercentage / 25)) as 0 | 1 | 2 | 3 | 4}
                size="sm"
              />
              <div className="flex justify-between mt-2 text-xs text-muted">
                <span>{stats.masteredCount} / {stats.totalObjects} mastered</span>
                {stats.dueCount > 0 && (
                  <span className="text-warning">{stats.dueCount} due</span>
                )}
              </div>
            </>
          )}
        </div>

        {stats && (
          <CircularProgress
            value={masteryPercentage}
            size={56}
            strokeWidth={5}
            variant="primary"
          >
            <span className="text-sm font-semibold">{masteryPercentage}%</span>
          </CircularProgress>
        )}
      </div>
    </GlassCard>
  );
};

// ============================================================================
// GoalList Component
// ============================================================================

export interface GoalListProps {
  /** List of goals */
  goals: GoalData[];
  /** Currently selected goal ID */
  selectedId?: string;
  /** Callback when a goal is selected */
  onSelect?: (goalId: string) => void;
  /** Callback to create a new goal */
  onCreate?: () => void;
  /** Display variant for all cards */
  variant?: 'default' | 'compact' | 'expanded';
  /** Layout direction */
  layout?: 'grid' | 'list';
  /** Additional CSS classes */
  className?: string;
}

export const GoalList: React.FC<GoalListProps> = ({
  goals,
  selectedId,
  onSelect,
  onCreate,
  variant = 'default',
  layout = 'grid',
  className = '',
}) => {
  const layoutClass = layout === 'grid'
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'flex flex-col gap-3';

  return (
    <div className={`goal-list ${layoutClass} ${className}`}>
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          selected={goal.id === selectedId}
          onClick={() => onSelect?.(goal.id)}
          variant={variant}
        />
      ))}

      {onCreate && (
        <GlassCard
          variant="light"
          padding="md"
          interactive
          onClick={onCreate}
          className="goal-card goal-card--create"
        >
          <div className="flex items-center justify-center gap-3 py-4">
            <span className="text-2xl text-primary">+</span>
            <span className="font-medium text-primary">Create New Goal</span>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default GoalCard;

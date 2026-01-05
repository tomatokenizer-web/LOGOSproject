/**
 * GlassProgress Component
 *
 * Progress indicators with Liquid Glass aesthetic.
 * Used for session progress, mastery visualization, and loading states.
 *
 * Design Philosophy:
 * - Progress bars show journey, not just destination
 * - Subtle glow indicates active progress
 * - Mastery gradient shows complete learning journey
 * - Circular progress for compact dashboard widgets
 */

import React from 'react';

export interface GlassProgressProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (default 100) */
  max?: number;
  /** Visual variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'mastery';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom label (overrides percentage) */
  label?: string;
  /** Animate the progress bar */
  animated?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantGradients = {
  default: 'from-neutral-400 to-neutral-500',
  primary: 'from-blue-500 to-blue-600',
  success: 'from-green-500 to-green-600',
  warning: 'from-amber-500 to-amber-600',
  danger: 'from-red-500 to-red-600',
  mastery: 'from-amber-500 via-blue-500 via-purple-500 to-green-500',
};

export const GlassProgress: React.FC<GlassProgressProps> = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = true,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const sizeClass = sizeClasses[size];
  const gradient = variantGradients[variant];

  return (
    <div className={`glass-progress-wrapper ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-muted">{label || 'Progress'}</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={`glass-progress ${sizeClass}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        <div
          className={`glass-progress-bar bg-gradient-to-r ${gradient} ${
            animated ? 'transition-all duration-500 ease-out' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * CircularProgress - Circular progress indicator
 */
export interface CircularProgressProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (default 100) */
  max?: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Visual variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Show percentage in center */
  showLabel?: boolean;
  /** Custom center content */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantColors = {
  default: 'hsl(var(--color-neutral-500))',
  primary: 'hsl(var(--color-primary))',
  success: 'hsl(var(--color-success))',
  warning: 'hsl(var(--color-warning))',
  danger: 'hsl(var(--color-danger))',
};

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  variant = 'primary',
  showLabel = true,
  children,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const color = variantColors[variant];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--color-neutral-200) / 0.5)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showLabel && (
          <span className="text-lg font-semibold">
            {Math.round(percentage)}%
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * MasteryProgress - Segmented progress showing mastery stages
 */
export interface MasteryProgressProps {
  /** Current mastery stage (0-4) */
  stage: 0 | 1 | 2 | 3 | 4;
  /** Show stage labels */
  showLabels?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const stageLabels = ['Unknown', 'Recognition', 'Recall', 'Controlled', 'Automatic'];
const stageColors = [
  'bg-neutral-300',
  'bg-amber-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
];

export const MasteryProgress: React.FC<MasteryProgressProps> = ({
  stage,
  showLabels = false,
  size = 'md',
  className = '',
}) => {
  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' };
  const heightClass = heights[size];

  return (
    <div className={`mastery-progress ${className}`}>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex-1 rounded-full ${heightClass} transition-all duration-300 ${
              s <= stage ? stageColors[s] : 'bg-neutral-200'
            } ${s <= stage ? 'opacity-100' : 'opacity-40'}`}
            role="progressbar"
            aria-valuenow={s <= stage ? 1 : 0}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-label={`Stage ${s}: ${stageLabels[s]} - ${s <= stage ? 'Complete' : 'Incomplete'}`}
          />
        ))}
      </div>
      {showLabels && (
        <div className="flex justify-between mt-1 text-xs text-muted">
          <span>Unknown</span>
          <span>Automatic</span>
        </div>
      )}
    </div>
  );
};

/**
 * SessionProgress - Progress bar with time/items remaining
 */
export interface SessionProgressProps {
  /** Current item index */
  current: number;
  /** Total items */
  total: number;
  /** Time elapsed in seconds */
  timeElapsed?: number;
  /** Target time in seconds */
  targetTime?: number;
  /** Additional CSS classes */
  className?: string;
}

export const SessionProgress: React.FC<SessionProgressProps> = ({
  current,
  total,
  timeElapsed,
  targetTime,
  className = '',
}) => {
  const itemProgress = (current / total) * 100;
  const timeProgress = timeElapsed && targetTime
    ? Math.min(100, (timeElapsed / targetTime) * 100)
    : null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`session-progress ${className}`}>
      {/* Item progress */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <GlassProgress value={itemProgress} size="sm" variant="primary" />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          {current} / {total}
        </span>
      </div>

      {/* Time progress (if tracking) */}
      {timeProgress !== null && timeElapsed !== undefined && targetTime && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <GlassProgress
              value={timeProgress}
              size="sm"
              variant={timeProgress > 100 ? 'warning' : 'success'}
            />
          </div>
          <span className="text-sm text-muted whitespace-nowrap">
            {formatTime(timeElapsed)} / {formatTime(targetTime)}
          </span>
        </div>
      )}
    </div>
  );
};

export default GlassProgress;

/**
 * FeedbackCard Component
 *
 * Displays feedback after answering a question.
 * Shows correctness, error analysis, and next steps.
 *
 * Design Philosophy:
 * - Clear visual distinction between correct/incorrect
 * - Error feedback is educational, not punitive
 * - Component-level error analysis guides improvement
 * - Quick progression to keep momentum
 */

import React from 'react';
import {
  GlassCard,
  GlassButton,
  GlassBadge,
  ComponentBadge,
  MasteryProgress,
} from '../ui';

// ============================================================================
// Types
// ============================================================================

export interface FeedbackData {
  /** Whether the answer was correct */
  correct: boolean;
  /** User's submitted answer */
  userAnswer: string;
  /** Expected correct answer */
  correctAnswer: string;
  /** Error analysis (if incorrect) */
  errorAnalysis?: {
    errorType: string;
    component: 'PHON' | 'MORPH' | 'LEX' | 'SYNT' | 'PRAG';
    explanation: string;
    correction: string;
    similarErrors?: string[];
  };
  /** Updated mastery info */
  mastery?: {
    previousStage: 0 | 1 | 2 | 3 | 4;
    newStage: 0 | 1 | 2 | 3 | 4;
    stability: number;
    nextReview: Date | null;
  };
  /** Response time in ms */
  responseTimeMs?: number;
  /** Points earned (for gamification) */
  pointsEarned?: number;
}

export interface FeedbackCardProps {
  /** Feedback data */
  feedback: FeedbackData;
  /** Original question content */
  questionContent: string;
  /** Callback to continue to next question */
  onContinue: () => void;
  /** Callback to retry the same question */
  onRetry?: () => void;
  /** Callback to report an issue with the question */
  onReport?: () => void;
  /** Whether to auto-advance after a delay */
  autoAdvance?: boolean;
  /** Delay before auto-advance (ms) */
  autoAdvanceDelay?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// FeedbackCard Component
// ============================================================================

export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  feedback,
  questionContent,
  onContinue,
  onRetry,
  onReport,
  autoAdvance = false,
  autoAdvanceDelay = 2000,
  className = '',
}) => {
  const [countdown, setCountdown] = React.useState<number | null>(null);

  // Auto-advance timer
  React.useEffect(() => {
    if (!autoAdvance) return;

    const delay = feedback.correct ? autoAdvanceDelay : autoAdvanceDelay * 2;
    setCountdown(Math.ceil(delay / 1000));

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          onContinue();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoAdvance, autoAdvanceDelay, feedback.correct, onContinue]);

  // Keyboard shortcut for continue
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinue]);

  const masteryImproved =
    feedback.mastery &&
    feedback.mastery.newStage > feedback.mastery.previousStage;

  return (
    <GlassCard
      variant={feedback.correct ? 'success' : 'danger'}
      className={`feedback-card ${className}`}
      padding="lg"
    >
      {/* Result header */}
      <div className="feedback-header">
        <div className="feedback-icon">
          {feedback.correct ? <CorrectIcon /> : <IncorrectIcon />}
        </div>
        <div className="feedback-result">
          <h2 className="feedback-title">
            {feedback.correct ? 'Correct!' : 'Not quite right'}
          </h2>
          {feedback.pointsEarned !== undefined && feedback.correct && (
            <span className="feedback-points">+{feedback.pointsEarned} pts</span>
          )}
        </div>
      </div>

      {/* Question and answer comparison */}
      <div className="feedback-comparison">
        <div className="comparison-row">
          <span className="comparison-label">Question:</span>
          <span className="comparison-value">{questionContent}</span>
        </div>

        <div className="comparison-row">
          <span className="comparison-label">Your answer:</span>
          <span
            className={`comparison-value ${
              feedback.correct ? 'text-success' : 'text-danger'
            }`}
          >
            {feedback.userAnswer || <em className="text-muted">No answer</em>}
          </span>
        </div>

        {!feedback.correct && (
          <div className="comparison-row">
            <span className="comparison-label">Correct answer:</span>
            <span className="comparison-value text-success">
              {feedback.correctAnswer}
            </span>
          </div>
        )}
      </div>

      {/* Error analysis (if incorrect) */}
      {!feedback.correct && feedback.errorAnalysis && (
        <div className="feedback-analysis glass-light animate-slide-in">
          <div className="analysis-header">
            <ComponentBadge component={feedback.errorAnalysis.component} />
            <span className="analysis-type">{feedback.errorAnalysis.errorType}</span>
          </div>
          <p className="analysis-explanation">{feedback.errorAnalysis.explanation}</p>
          {feedback.errorAnalysis.similarErrors &&
            feedback.errorAnalysis.similarErrors.length > 0 && (
              <div className="analysis-similar">
                <span className="text-sm text-muted">Watch out for similar errors:</span>
                <ul className="similar-list">
                  {feedback.errorAnalysis.similarErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* Mastery progress */}
      {feedback.mastery && (
        <div className="feedback-mastery">
          <div className="mastery-header">
            <span className="mastery-label">Mastery Progress</span>
            {masteryImproved && (
              <GlassBadge variant="success" size="sm">
                Level Up!
              </GlassBadge>
            )}
          </div>
          <MasteryProgress stage={feedback.mastery.newStage} showLabels />
          {feedback.mastery.nextReview && (
            <p className="mastery-next-review text-sm text-muted mt-2">
              Next review: {formatNextReview(feedback.mastery.nextReview)}
            </p>
          )}
        </div>
      )}

      {/* Response time (if tracked) */}
      {feedback.responseTimeMs !== undefined && (
        <div className="feedback-stats text-sm text-muted">
          Response time: {(feedback.responseTimeMs / 1000).toFixed(1)}s
        </div>
      )}

      {/* Actions */}
      <div className="feedback-actions">
        <div className="feedback-actions-left">
          {onReport && (
            <GlassButton variant="ghost" size="sm" onClick={onReport}>
              Report Issue
            </GlassButton>
          )}
        </div>
        <div className="feedback-actions-right">
          {!feedback.correct && onRetry && (
            <GlassButton variant="ghost" onClick={onRetry}>
              Try Again
            </GlassButton>
          )}
          <GlassButton variant="primary" onClick={onContinue}>
            {countdown !== null ? `Continue (${countdown})` : 'Continue'}
          </GlassButton>
        </div>
      </div>

      <p className="feedback-hint text-center text-xs text-muted mt-4">
        Press Enter or Space to continue
      </p>

      <style>{`
        .feedback-card {
          max-width: 600px;
          margin: 0 auto;
        }

        .feedback-header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .feedback-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: var(--radius-full);
          background: currentColor;
        }

        .feedback-icon svg {
          width: 32px;
          height: 32px;
          color: white;
        }

        .feedback-card[class*="glass-success"] .feedback-icon {
          background: hsl(var(--color-success));
        }

        .feedback-card[class*="glass-danger"] .feedback-icon {
          background: hsl(var(--color-danger));
        }

        .feedback-result {
          flex: 1;
        }

        .feedback-title {
          font-size: var(--text-2xl);
          font-weight: var(--font-bold);
          margin-bottom: var(--space-1);
        }

        .feedback-points {
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          color: hsl(var(--color-success));
        }

        .feedback-comparison {
          background: hsl(var(--glass-tint-light) / 0.5);
          border-radius: var(--radius-xl);
          padding: var(--space-4);
          margin-bottom: var(--space-4);
        }

        .comparison-row {
          display: flex;
          gap: var(--space-3);
          padding: var(--space-2) 0;
        }

        .comparison-row:not(:last-child) {
          border-bottom: 1px solid hsl(var(--glass-border));
        }

        .comparison-label {
          flex-shrink: 0;
          width: 100px;
          font-size: var(--text-sm);
          color: hsl(var(--color-neutral-500));
        }

        .comparison-value {
          flex: 1;
          font-weight: var(--font-medium);
        }

        .feedback-analysis {
          padding: var(--space-4);
          border-radius: var(--radius-xl);
          margin-bottom: var(--space-4);
        }

        .analysis-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-2);
        }

        .analysis-type {
          font-weight: var(--font-medium);
        }

        .analysis-explanation {
          color: hsl(var(--color-neutral-700));
          line-height: var(--leading-relaxed);
        }

        .analysis-similar {
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid hsl(var(--glass-border));
        }

        .similar-list {
          margin-top: var(--space-2);
          padding-left: var(--space-4);
          font-size: var(--text-sm);
        }

        .similar-list li {
          margin-bottom: var(--space-1);
        }

        .feedback-mastery {
          padding: var(--space-4);
          background: hsl(var(--glass-tint-light) / 0.5);
          border-radius: var(--radius-xl);
          margin-bottom: var(--space-4);
        }

        .mastery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-3);
        }

        .mastery-label {
          font-weight: var(--font-medium);
        }

        .feedback-stats {
          text-align: center;
          margin-bottom: var(--space-4);
        }

        .feedback-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .feedback-actions-left,
        .feedback-actions-right {
          display: flex;
          gap: var(--space-2);
        }

        .feedback-hint {
          opacity: 0.6;
        }
      `}</style>
    </GlassCard>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

const CorrectIcon: React.FC = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const IncorrectIcon: React.FC = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const formatNextReview = (date: Date): string => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (days > 7) {
    return date.toLocaleDateString();
  } else if (days > 1) {
    return `in ${days} days`;
  } else if (days === 1) {
    return 'tomorrow';
  } else if (hours > 1) {
    return `in ${hours} hours`;
  } else {
    return 'soon';
  }
};

export default FeedbackCard;

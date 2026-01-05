/**
 * SessionView Component
 *
 * The main learning session container that orchestrates the learning flow.
 * Manages question progression, state transitions, and session analytics.
 *
 * Design Philosophy:
 * - Focus mode: minimal distractions during learning
 * - Smooth transitions between question and feedback
 * - Progress always visible but not distracting
 * - Easy exit without losing progress
 */

import React, { useState, useCallback, useEffect } from 'react';
import { GlassCard, GlassButton, SessionProgress, CircularProgress } from '../ui';
import { QuestionCard, LearningItem } from './QuestionCard';
import { FeedbackCard, FeedbackData } from './FeedbackCard';

// ============================================================================
// Types
// ============================================================================

export interface SessionConfig {
  /** Session type */
  type: 'learn' | 'review' | 'mixed';
  /** Target duration in minutes */
  targetDuration?: number;
  /** Number of items to study */
  sessionSize?: number;
  /** Time limit per question in seconds */
  questionTimeLimit?: number;
  /** Auto-advance after correct answer */
  autoAdvance?: boolean;
  /** Auto-advance delay in ms */
  autoAdvanceDelay?: number;
}

export interface SessionItem extends LearningItem {
  /** Recognition options (for recognition mode) */
  options?: string[];
  /** Question mode */
  mode: 'recall' | 'recognition' | 'typing' | 'listening';
  /** Expected answer */
  expectedAnswer: string;
}

export interface SessionState {
  /** Current phase */
  phase: 'ready' | 'question' | 'feedback' | 'complete' | 'paused';
  /** Current item index */
  currentIndex: number;
  /** Items in this session */
  items: SessionItem[];
  /** Responses collected */
  responses: Array<{
    itemId: string;
    correct: boolean;
    userAnswer: string;
    cueLevel: 0 | 1 | 2 | 3;
    responseTimeMs: number;
  }>;
  /** Session start time */
  startTime: Date;
  /** Time spent (excluding pauses) */
  elapsedMs: number;
}

export interface SessionViewProps {
  /** Session configuration */
  config: SessionConfig;
  /** Items to study */
  items: SessionItem[];
  /** Goal information */
  goal: {
    id: string;
    name: string;
    targetLanguage: string;
  };
  /** Callback to check answer */
  onCheckAnswer: (
    itemId: string,
    answer: string,
    cueLevel: 0 | 1 | 2 | 3,
    responseTimeMs: number
  ) => Promise<FeedbackData>;
  /** Callback to get hint */
  onGetHint?: (itemId: string, level: number) => Promise<string>;
  /** Callback when session completes */
  onComplete: (stats: SessionStats) => void;
  /** Callback to exit session early */
  onExit: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface SessionStats {
  totalItems: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  accuracy: number;
  averageResponseTime: number;
  totalTimeMs: number;
  cueFreeAccuracy: number;
}

// ============================================================================
// SessionView Component
// ============================================================================

export const SessionView: React.FC<SessionViewProps> = ({
  config,
  items,
  goal,
  onCheckAnswer,
  onGetHint,
  onComplete,
  onExit,
  className = '',
}) => {
  const [state, setState] = useState<SessionState>({
    phase: 'ready',
    currentIndex: 0,
    items,
    responses: [],
    startTime: new Date(),
    elapsedMs: 0,
  });

  const [currentFeedback, setCurrentFeedback] = useState<FeedbackData | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);

  // Timer for elapsed time
  useEffect(() => {
    if (state.phase === 'question' && !isPaused) {
      const interval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsedMs: prev.elapsedMs + 1000,
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state.phase, isPaused]);

  const currentItem = state.items[state.currentIndex];

  const handleStart = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'question',
      startTime: new Date(),
    }));
    setQuestionStartTime(Date.now());
  }, []);

  const handleAnswer = useCallback(
    async (answer: string, cueLevel: 0 | 1 | 2 | 3) => {
      if (!currentItem) return;

      const responseTimeMs = Date.now() - questionStartTime;

      // Get feedback from parent
      const feedback = await onCheckAnswer(
        currentItem.id,
        answer,
        cueLevel,
        responseTimeMs
      );

      // Record response
      setState((prev) => ({
        ...prev,
        phase: 'feedback',
        responses: [
          ...prev.responses,
          {
            itemId: currentItem.id,
            correct: feedback.correct,
            userAnswer: answer,
            cueLevel,
            responseTimeMs,
          },
        ],
      }));

      setCurrentFeedback(feedback);
    },
    [currentItem, questionStartTime, onCheckAnswer]
  );

  const handleContinue = useCallback(() => {
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.items.length) {
      // Session complete
      const stats = calculateStats(state.responses, state.elapsedMs);
      setState((prev) => ({ ...prev, phase: 'complete' }));
      onComplete(stats);
    } else {
      // Next question
      setState((prev) => ({
        ...prev,
        phase: 'question',
        currentIndex: nextIndex,
      }));
      setQuestionStartTime(Date.now());
      setCurrentFeedback(null);
    }
  }, [state.currentIndex, state.items.length, state.responses, state.elapsedMs, onComplete]);

  const handleRetry = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'question' }));
    setQuestionStartTime(Date.now());
    setCurrentFeedback(null);
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    setState((prev) => ({ ...prev, phase: 'paused' }));
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    setState((prev) => ({ ...prev, phase: 'question' }));
    setQuestionStartTime(Date.now());
  }, []);

  const handleGetHint = useCallback(async () => {
    if (!onGetHint || !currentItem) return '';
    const currentCueLevel = state.responses.filter(
      (r) => r.itemId === currentItem.id
    ).length;
    return onGetHint(currentItem.id, currentCueLevel + 1);
  }, [onGetHint, currentItem, state.responses]);

  // Ready screen
  if (state.phase === 'ready') {
    return (
      <div className={`session-view session-view--ready ${className}`}>
        <GlassCard padding="lg" className="session-ready-card">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Ready to Learn?</h2>
            <p className="text-muted mb-6">
              {goal.name} • {state.items.length} items
            </p>

            <div className="session-config mb-6">
              <div className="config-item">
                <span className="config-label">Session Type</span>
                <span className="config-value capitalize">{config.type}</span>
              </div>
              {config.targetDuration && (
                <div className="config-item">
                  <span className="config-label">Target Time</span>
                  <span className="config-value">{config.targetDuration} min</span>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3">
              <GlassButton variant="ghost" onClick={onExit}>
                Cancel
              </GlassButton>
              <GlassButton variant="primary" size="lg" onClick={handleStart}>
                Start Session
              </GlassButton>
            </div>
          </div>
        </GlassCard>

        <style>{`
          .session-view--ready {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
          }

          .session-ready-card {
            max-width: 400px;
            width: 100%;
          }

          .session-config {
            display: flex;
            justify-content: center;
            gap: var(--space-6);
          }

          .config-item {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .config-label {
            font-size: var(--text-xs);
            color: hsl(var(--color-neutral-500));
            text-transform: uppercase;
            letter-spacing: var(--tracking-wide);
          }

          .config-value {
            font-size: var(--text-lg);
            font-weight: var(--font-semibold);
          }
        `}</style>
      </div>
    );
  }

  // Paused screen
  if (state.phase === 'paused') {
    return (
      <div className={`session-view session-view--paused ${className}`}>
        <GlassCard padding="lg" className="session-paused-card">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Session Paused</h2>

            <SessionProgress
              current={state.currentIndex}
              total={state.items.length}
              timeElapsed={Math.floor(state.elapsedMs / 1000)}
              targetTime={config.targetDuration ? config.targetDuration * 60 : undefined}
              className="mb-6"
            />

            <div className="flex justify-center gap-3">
              <GlassButton variant="ghost" onClick={onExit}>
                End Session
              </GlassButton>
              <GlassButton variant="primary" onClick={handleResume}>
                Resume
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Complete screen
  if (state.phase === 'complete') {
    const stats = calculateStats(state.responses, state.elapsedMs);
    return (
      <SessionComplete stats={stats} goal={goal} onClose={onExit} />
    );
  }

  // Active session (question or feedback)
  return (
    <div className={`session-view ${className}`}>
      {/* Session header */}
      <div className="session-header">
        <div className="session-goal">
          <span className="text-sm text-muted">{goal.name}</span>
        </div>
        <SessionProgress
          current={state.currentIndex + 1}
          total={state.items.length}
          timeElapsed={Math.floor(state.elapsedMs / 1000)}
          targetTime={config.targetDuration ? config.targetDuration * 60 : undefined}
        />
        <GlassButton variant="ghost" size="sm" onClick={handlePause}>
          Pause
        </GlassButton>
      </div>

      {/* Question or Feedback */}
      <div className="session-content">
        {state.phase === 'question' && currentItem && (
          <QuestionCard
            item={currentItem}
            mode={currentItem.mode}
            options={currentItem.options}
            progress={{ current: state.currentIndex + 1, total: state.items.length }}
            timeLimit={config.questionTimeLimit}
            onSubmit={handleAnswer}
            onRequestHint={onGetHint ? handleGetHint : undefined}
          />
        )}

        {state.phase === 'feedback' && currentFeedback && currentItem && (
          <FeedbackCard
            feedback={currentFeedback}
            questionContent={currentItem.content}
            onContinue={handleContinue}
            onRetry={!currentFeedback.correct ? handleRetry : undefined}
            autoAdvance={config.autoAdvance && currentFeedback.correct}
            autoAdvanceDelay={config.autoAdvanceDelay}
          />
        )}
      </div>

      <style>{`
        .session-view {
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }

        .session-header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
          margin-bottom: var(--space-4);
        }

        .session-goal {
          flex-shrink: 0;
        }

        .session-header .session-progress {
          flex: 1;
        }

        .session-content {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: var(--space-4);
        }

        .session-view--paused {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
        }

        .session-paused-card {
          max-width: 400px;
          width: 100%;
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Session Complete Component
// ============================================================================

const SessionComplete: React.FC<{
  stats: SessionStats;
  goal: { name: string };
  onClose: () => void;
}> = ({ stats, goal, onClose }) => {
  const grade = getGrade(stats.accuracy);

  return (
    <div className="session-complete">
      <GlassCard padding="lg" className="session-complete-card">
        <div className="text-center mb-6">
          <div className="complete-icon mb-4">
            <span className="text-5xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-muted">{goal.name}</p>
        </div>

        <div className="stats-grid">
          <div className="stat-main">
            <CircularProgress
              value={stats.accuracy * 100}
              size={120}
              strokeWidth={10}
              variant={grade.variant}
            >
              <div className="text-center">
                <span className="text-3xl font-bold">{Math.round(stats.accuracy * 100)}%</span>
                <span className="block text-sm text-muted">{grade.label}</span>
              </div>
            </CircularProgress>
          </div>

          <div className="stat-details">
            <div className="stat-row">
              <span className="stat-label">Correct</span>
              <span className="stat-value text-success">{stats.correctCount}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Incorrect</span>
              <span className="stat-value text-danger">{stats.incorrectCount}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Skipped</span>
              <span className="stat-value text-muted">{stats.skippedCount}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Avg Response</span>
              <span className="stat-value">{(stats.averageResponseTime / 1000).toFixed(1)}s</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total Time</span>
              <span className="stat-value">{formatDuration(stats.totalTimeMs)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Cue-Free Accuracy</span>
              <span className="stat-value">{Math.round(stats.cueFreeAccuracy * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <GlassButton variant="primary" size="lg" onClick={onClose}>
            Done
          </GlassButton>
        </div>
      </GlassCard>

      <style>{`
        .session-complete {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
        }

        .session-complete-card {
          max-width: 500px;
          width: 100%;
        }

        .complete-icon {
          display: inline-block;
          animation: bounce 1s ease infinite;
        }

        .stats-grid {
          display: flex;
          gap: var(--space-6);
          align-items: center;
        }

        .stat-main {
          flex-shrink: 0;
        }

        .stat-details {
          flex: 1;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: var(--space-2) 0;
          border-bottom: 1px solid hsl(var(--glass-border));
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-label {
          color: hsl(var(--color-neutral-500));
        }

        .stat-value {
          font-weight: var(--font-semibold);
        }

        @media (max-width: 500px) {
          .stats-grid {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateStats(
  responses: SessionState['responses'],
  totalTimeMs: number
): SessionStats {
  const correctCount = responses.filter((r) => r.correct).length;
  const incorrectCount = responses.filter((r) => !r.correct && r.userAnswer).length;
  const skippedCount = responses.filter((r) => !r.correct && !r.userAnswer).length;

  const cueFreeResponses = responses.filter((r) => r.cueLevel === 0);
  const cueFreeCorrect = cueFreeResponses.filter((r) => r.correct).length;

  const totalResponseTime = responses.reduce((sum, r) => sum + r.responseTimeMs, 0);

  return {
    totalItems: responses.length,
    correctCount,
    incorrectCount,
    skippedCount,
    accuracy: responses.length > 0 ? correctCount / responses.length : 0,
    averageResponseTime: responses.length > 0 ? totalResponseTime / responses.length : 0,
    totalTimeMs,
    cueFreeAccuracy: cueFreeResponses.length > 0 ? cueFreeCorrect / cueFreeResponses.length : 0,
  };
}

function getGrade(accuracy: number): { label: string; variant: 'success' | 'primary' | 'warning' | 'danger' } {
  if (accuracy >= 0.9) return { label: 'Excellent!', variant: 'success' };
  if (accuracy >= 0.75) return { label: 'Great!', variant: 'primary' };
  if (accuracy >= 0.6) return { label: 'Good', variant: 'warning' };
  return { label: 'Keep practicing', variant: 'danger' };
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default SessionView;

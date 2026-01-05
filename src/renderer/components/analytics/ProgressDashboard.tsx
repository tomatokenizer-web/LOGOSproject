/**
 * ProgressDashboard Component
 *
 * Main analytics dashboard for learning progress visualization.
 */

import React from 'react';
import { GlassCard, GlassButton, GlassBadge, CircularProgress, GlassProgress, ComponentBadge } from '../ui';

export type ComponentType = 'PHON' | 'MORPH' | 'LEX' | 'SYNT' | 'PRAG';

export interface ThetaByComponent {
  PHON: number;
  MORPH: number;
  LEX: number;
  SYNT: number;
  PRAG: number;
}

export interface ProgressData {
  overallProgress: number;
  totalItems: number;
  masteryDistribution: [number, number, number, number, number];
  dueCount: number;
  streak: number;
  totalStudyTime: number;
  averageAccuracy: number;
  cueFreeAccuracy: number;
  thetaByComponent?: ThetaByComponent;
}

export interface BottleneckData {
  primaryBottleneck: ComponentType | null;
  confidence: number;
  evidence: Array<{ component: ComponentType; errorRate: number; totalErrors: number }>;
  recommendation: string;
}

export interface GoalInfo {
  id: string;
  /** Goal name/title (e.g., "Medical English") */
  name?: string;
  /** Target language (e.g., "English") */
  targetLanguage?: string;
  /** Domain specialization (e.g., "medical", "legal") */
  domain?: string;
  /** Target modalities */
  modality?: string[];
  /** Genre (e.g., "report", "conversation") */
  genre?: string;
  /** Purpose (e.g., "certification", "professional") */
  purpose?: string;
  /** Target benchmark (e.g., "CELBAN", "IELTS") */
  benchmark?: string;
}

export interface ProgressDashboardProps {
  goal: GoalInfo;
  progress: ProgressData;
  bottleneck?: BottleneckData;
  onStartSession?: () => void;
  className?: string;
}

const COMPONENT_LABELS: Record<ComponentType, string> = {
  PHON: 'Phonology',
  MORPH: 'Morphology',
  LEX: 'Lexical',
  SYNT: 'Syntax',
  PRAG: 'Pragmatics',
};

const thetaToLevel = (theta: number): string => {
  if (theta >= 2.0) return 'C2';
  if (theta >= 1.5) return 'C1';
  if (theta >= 0.5) return 'B2';
  if (theta >= -0.5) return 'B1';
  if (theta >= -1.5) return 'A2';
  return 'A1';
};

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  goal, progress, bottleneck, onStartSession, className = ''
}) => {
  const masteredCount = progress.masteryDistribution[3] + progress.masteryDistribution[4];
  const learningCount = progress.masteryDistribution[1] + progress.masteryDistribution[2];

  // Build title and subtitle from available goal fields
  const title = goal.name || goal.genre || 'Learning Goal';
  const subtitleParts: string[] = [];
  if (goal.targetLanguage) subtitleParts.push(goal.targetLanguage);
  if (goal.domain) subtitleParts.push(goal.domain);
  if (goal.modality?.length) subtitleParts.push(goal.modality.join(', '));
  if (goal.purpose) subtitleParts.push(goal.purpose);
  if (goal.benchmark) subtitleParts.push(goal.benchmark);
  const subtitle = subtitleParts.join(' | ');

  return (
    <div className={`progress-dashboard flex flex-col gap-6 ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted">{subtitle}</p>}
        </div>
        {onStartSession && <GlassButton variant="primary" onClick={onStartSession}>Start Session</GlassButton>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="col-span-2 flex flex-col items-center p-6">
          <CircularProgress value={progress.overallProgress} size={140} strokeWidth={12} variant="primary">
            <div className="text-center">
              <span className="text-4xl font-bold">{Math.round(progress.overallProgress)}%</span>
              <span className="block text-sm text-muted">Complete</span>
            </div>
          </CircularProgress>
          <div className="flex gap-6 mt-4">
            <div className="text-center"><span className="text-2xl font-bold text-success">{masteredCount}</span><br/><span className="text-xs text-muted">Mastered</span></div>
            <div className="text-center"><span className="text-2xl font-bold text-primary">{learningCount}</span><br/><span className="text-xs text-muted">Learning</span></div>
            <div className="text-center"><span className="text-2xl font-bold">{progress.masteryDistribution[0]}</span><br/><span className="text-xs text-muted">New</span></div>
          </div>
        </GlassCard>

        <GlassCard className="text-center p-4">
          <span className="text-2xl">🔥</span>
          <div className="text-2xl font-bold">{progress.streak}</div>
          <div className="text-sm text-muted">Day Streak</div>
        </GlassCard>
        <GlassCard className="text-center p-4">
          <span className="text-2xl">📚</span>
          <div className="text-2xl font-bold">{progress.dueCount}</div>
          <div className="text-sm text-muted">Due Today</div>
          {progress.dueCount > 0 && <GlassBadge variant="warning" size="sm">Review</GlassBadge>}
        </GlassCard>
        <GlassCard className="text-center p-4">
          <span className="text-2xl">🎯</span>
          <div className="text-2xl font-bold">{Math.round(progress.averageAccuracy * 100)}%</div>
          <div className="text-sm text-muted">Accuracy</div>
        </GlassCard>
        <GlassCard className="text-center p-4">
          <span className="text-2xl">⏱️</span>
          <div className="text-2xl font-bold">{Math.floor(progress.totalStudyTime / 60)}h</div>
          <div className="text-sm text-muted">Study Time</div>
        </GlassCard>
      </div>

      {bottleneck?.primaryBottleneck && (
        <GlassCard variant="warning" header="Area for Improvement">
          <div className="flex items-start gap-4">
            <ComponentBadge component={bottleneck.primaryBottleneck} size="lg" />
            <div>
              <p className="text-sm text-muted">{Math.round(bottleneck.confidence * 100)}% confidence</p>
              <p>{bottleneck.recommendation}</p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard header="Scaffolding Gap">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="w-32 text-sm">Cue-Free</span>
            <GlassProgress value={progress.cueFreeAccuracy * 100} variant="primary" />
            <span className="w-12 font-semibold">{Math.round(progress.cueFreeAccuracy * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-32 text-sm">With Cues</span>
            <GlassProgress value={progress.averageAccuracy * 100} variant="success" />
            <span className="w-12 font-semibold">{Math.round(progress.averageAccuracy * 100)}%</span>
          </div>
          <p className="text-sm text-muted mt-2">
            Gap: {Math.round((progress.averageAccuracy - progress.cueFreeAccuracy) * 100)}% -
            {progress.averageAccuracy - progress.cueFreeAccuracy < 0.1 ? ' Well consolidated!' : ' Focus on independent recall.'}
          </p>
        </div>
      </GlassCard>

      {progress.thetaByComponent && (
        <GlassCard header="Ability by Component">
          <div className="flex flex-col gap-3">
            {(Object.keys(progress.thetaByComponent) as ComponentType[]).map((comp) => {
              const theta = progress.thetaByComponent![comp];
              const level = thetaToLevel(theta);
              const normalizedValue = ((theta + 3) / 6) * 100;
              const isBottleneck = bottleneck?.primaryBottleneck === comp;

              return (
                <div key={comp} className="flex items-center gap-3">
                  <div className="w-28 flex items-center gap-2">
                    <ComponentBadge component={comp} size="sm" />
                    <span className="text-sm">{COMPONENT_LABELS[comp]}</span>
                  </div>
                  <GlassProgress
                    value={Math.max(0, Math.min(100, normalizedValue))}
                    variant={isBottleneck ? 'warning' : 'primary'}
                  />
                  <div className="w-16 text-right">
                    <span className="font-semibold">{level}</span>
                    <span className="text-xs text-muted ml-1">({theta.toFixed(1)})</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted mt-4">
            Values show estimated CEFR level equivalent and raw theta score (-3 to +3 scale).
          </p>
        </GlassCard>
      )}
    </div>
  );
};

export default ProgressDashboard;

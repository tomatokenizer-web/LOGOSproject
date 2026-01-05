/**
 * SessionPage
 *
 * Learning session page that wraps SessionView with navigation.
 */

import React, { useState, useCallback } from 'react';
import { useApp } from '../context';
import { useQueue, useStartSession, useEndSession, useRecordResponse, useAnalyzeError, useGetHint } from '../hooks';
import { SessionView } from '../components/session';
import { GlassCard, GlassButton } from '../components/ui';

interface SessionPageProps {
  onNavigateBack?: () => void;
}

export const SessionPage: React.FC<SessionPageProps> = ({ onNavigateBack }) => {
  const { activeGoal, activeGoalId } = useApp();
  const { data: queue, loading: queueLoading, refetch: refreshQueue } = useQueue(activeGoalId, 20);
  const { execute: startSession } = useStartSession();
  const { execute: endSession } = useEndSession();
  const { execute: recordResponse } = useRecordResponse();
  const { execute: analyzeError } = useAnalyzeError();
  const { execute: getHint } = useGetHint();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Transform queue to session items
  const sessionItems = queue?.map((item: any) => ({
    id: item.id,
    objectId: item.objectId,
    targetForm: item.targetForm,
    nativeForm: item.nativeForm,
    context: item.context,
    component: item.component,
    masteryStage: item.masteryStage,
    scaffoldingLevel: item.scaffoldingLevel,
    cues: item.cues || [],
    priority: item.priority,
  })) || [];

  // Handle session start
  const handleStartSession = useCallback(async () => {
    if (!activeGoalId) return;

    try {
      const result = await startSession({ goalId: activeGoalId });
      setSessionId(result.id);
      setSessionStarted(true);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }, [activeGoalId, startSession]);

  // Handle session end
  const handleEndSession = useCallback(async (stats: any) => {
    if (!sessionId) return;

    try {
      await endSession({ sessionId, stats });
      setSessionId(null);
      setSessionStarted(false);
      onNavigateBack?.();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [sessionId, endSession, onNavigateBack]);

  // Handle response recording
  const handleRecordResponse = useCallback(async (
    itemId: string,
    response: string,
    correct: boolean,
    responseTime: number,
    scaffoldingUsed: string[]
  ) => {
    if (!sessionId) return { feedback: null, updated: null };

    try {
      const result = await recordResponse({
        sessionId,
        itemId,
        response,
        correct,
        responseTime,
        scaffoldingUsed,
      });
      return result;
    } catch (error) {
      console.error('Failed to record response:', error);
      return { feedback: null, updated: null };
    }
  }, [sessionId, recordResponse]);

  // Handle error analysis
  const handleAnalyzeError = useCallback(async (
    targetForm: string,
    userResponse: string,
    context?: string
  ) => {
    try {
      const result = await analyzeError({ targetForm, userResponse, context });
      return result;
    } catch (error) {
      console.error('Failed to analyze error:', error);
      return null;
    }
  }, [analyzeError]);

  // Handle hint request
  const handleGetHint = useCallback(async (
    targetForm: string,
    component: string,
    currentHints: string[]
  ) => {
    try {
      const result = await getHint({ targetForm, component, currentHints });
      return result?.hint || null;
    } catch (error) {
      console.error('Failed to get hint:', error);
      return null;
    }
  }, [getHint]);

  // No goal selected
  if (!activeGoal) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-2xl font-bold mb-2">No Goal Selected</h1>
          <p className="text-muted">Please select a learning goal to start a session.</p>
        </div>
        {onNavigateBack && (
          <GlassButton variant="ghost" onClick={onNavigateBack}>
            ← Back to Dashboard
          </GlassButton>
        )}
      </div>
    );
  }

  // Loading queue
  if (queueLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">📚</div>
          <p className="text-muted">Preparing your session...</p>
        </div>
      </div>
    );
  }

  // Empty queue
  if (sessionItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-6xl mb-4">✨</div>
          <h1 className="text-2xl font-bold mb-2">All Caught Up!</h1>
          <p className="text-muted mb-4">
            You've reviewed all items for now. Add more content or check back later.
          </p>
          <div className="flex gap-3 justify-center">
            <GlassButton variant="ghost" onClick={onNavigateBack}>
              ← Dashboard
            </GlassButton>
            <GlassButton variant="primary" onClick={() => refreshQueue()}>
              Refresh
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Pre-session screen
  if (!sessionStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-2xl font-bold mb-2">Ready to Learn?</h1>
          <p className="text-muted mb-2">{activeGoal.name}</p>
          <p className="text-lg font-medium mb-4">{sessionItems.length} items to review</p>
          <div className="flex gap-3 justify-center">
            <GlassButton variant="ghost" onClick={onNavigateBack}>
              ← Back
            </GlassButton>
            <GlassButton variant="primary" size="lg" onClick={handleStartSession}>
              Start Session
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Active session
  return (
    <SessionView
      items={sessionItems}
      config={{
        goalId: activeGoalId!,
        sessionType: 'mixed',
        itemCount: sessionItems.length,
        adaptiveScaffolding: true,
        showProgress: true,
        allowSkip: true,
      }}
      onComplete={handleEndSession}
      onRecordResponse={handleRecordResponse}
      onAnalyzeError={handleAnalyzeError}
      onGetHint={handleGetHint}
      className="h-full"
    />
  );
};

export default SessionPage;

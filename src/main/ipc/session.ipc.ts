/**
 * Session IPC Handlers
 *
 * Handles all session-related IPC communication.
 * Sessions track learning activities, responses, and analytics.
 */

import { registerHandler, success, error, validateUUID, validateRequired } from './contracts';
import { prisma } from '../db/client';
import { FSRS, createNewCard, updateMastery, responseToRating, determineStage } from '../../core/fsrs';
import { analyzeBottleneck } from '../../core/bottleneck';
import { estimateThetaMLE } from '../../core/irt';
import type { ResponseData } from '../../core/fsrs';
import type { ResponseData as BottleneckResponse, ComponentType } from '../../core/bottleneck';

// Singleton FSRS instance
const fsrs = new FSRS();

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register all session-related IPC handlers.
 */
export function registerSessionHandlers(): void {
  // Start a new session
  registerHandler('session:start', async (_event, request) => {
    const { goalId, mode, maxItems, targetDurationMinutes, focusComponents } = request as {
      goalId: string;
      mode: 'learning' | 'training' | 'evaluation';
      maxItems?: number;
      targetDurationMinutes?: number;
      focusComponents?: string[];
    };

    const goalError = validateUUID(goalId, 'goalId');
    if (goalError) return error(goalError);

    if (!['learning', 'training', 'evaluation'].includes(mode)) {
      return error('mode must be learning, training, or evaluation');
    }

    try {
      // Get or create default user
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'default@logos.local',
            name: 'Default User',
          },
        });
      }

      // End any existing active session for this goal
      await prisma.session.updateMany({
        where: { goalId, endedAt: null },
        data: { endedAt: new Date() },
      });

      const session = await prisma.session.create({
        data: {
          goalId,
          userId: user.id,
          mode,
          startedAt: new Date(),
        },
      });

      // Get first task from learning queue
      const firstItem = await prisma.languageObject.findFirst({
        where: { goalId },
        include: { mastery: true },
        orderBy: { priority: 'desc' },
      });

      return success({
        sessionId: session.id,
        firstTask: firstItem ? {
          objectId: firstItem.id,
          content: firstItem.content,
          type: firstItem.type,
          masteryStage: firstItem.mastery?.stage ?? 0,
        } : null,
        queueLength: await prisma.languageObject.count({ where: { goalId } }),
      });
    } catch (err) {
      console.error('Failed to start session:', err);
      return error('Failed to start session');
    }
  });

  // End current session
  registerHandler('session:end', async (_event, request) => {
    const { sessionId } = request as { sessionId: string };

    const idError = validateUUID(sessionId, 'sessionId');
    if (idError) return error(idError);

    try {
      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
        include: {
          responses: true,
        },
      });

      // Calculate session stats
      const totalResponses = session.responses.length;
      const correctResponses = session.responses.filter(r => r.correct).length;
      const accuracy = totalResponses > 0 ? correctResponses / totalResponses : 0;
      const duration = session.endedAt
        ? (session.endedAt.getTime() - session.startedAt.getTime()) / 1000 / 60
        : 0;

      return success({
        id: session.id,
        endedAt: session.endedAt,
        stats: {
          totalResponses,
          correctResponses,
          accuracy,
          durationMinutes: Math.round(duration * 10) / 10,
        },
      });
    } catch (err) {
      console.error('Failed to end session:', err);
      return error('Failed to end session');
    }
  });

  // Get current session state
  registerHandler('session:get-state', async (_event, request) => {
    const { sessionId } = request as { sessionId: string };

    const idError = validateUUID(sessionId, 'sessionId');
    if (idError) return error(idError);

    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          responses: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!session) {
        return error('Session not found');
      }

      const correctCount = session.responses.filter(r => r.correct).length;

      return success({
        sessionId: session.id,
        mode: session.mode,
        itemsPracticed: session.itemsPracticed,
        stageTransitions: session.stageTransitions,
        accuracy: session.responses.length > 0 ? correctCount / session.responses.length : 0,
        startedAt: session.startedAt,
        isActive: session.endedAt === null,
      });
    } catch (err) {
      console.error('Failed to get session state:', err);
      return error('Failed to get session state');
    }
  });

  // Submit a response
  registerHandler('session:submit-response', async (_event, request) => {
    const { sessionId, objectId, correct, cueLevel, responseTimeMs, taskType, taskFormat, modality, responseContent, expectedContent } = request as {
      sessionId: string;
      objectId: string;
      correct: boolean;
      cueLevel: 0 | 1 | 2 | 3;
      responseTimeMs: number;
      taskType?: string;
      taskFormat?: string;
      modality?: string;
      responseContent?: string;
      expectedContent?: string;
    };

    const sessionError = validateUUID(sessionId, 'sessionId');
    if (sessionError) return error(sessionError);

    const objectError = validateUUID(objectId, 'objectId');
    if (objectError) return error(objectError);

    if (typeof correct !== 'boolean') {
      return error('correct must be a boolean');
    }

    if (![0, 1, 2, 3].includes(cueLevel)) {
      return error('cueLevel must be 0, 1, 2, or 3');
    }

    try {
      // Create response record
      const response = await prisma.response.create({
        data: {
          sessionId,
          objectId,
          correct,
          cueLevel,
          responseTimeMs,
          taskType: taskType || 'recall',
          taskFormat: taskFormat || 'free_response',
          modality: modality || 'visual',
          responseContent,
          expectedContent,
        },
      });

      // Get or create mastery state
      let mastery = await prisma.masteryState.findUnique({
        where: { objectId },
      });

      const responseData: ResponseData = {
        correct,
        cueLevel: cueLevel as 0 | 1 | 2 | 3,
        responseTimeMs,
      };

      const now = new Date();

      if (!mastery) {
        // Create new mastery state
        const newCard = createNewCard();
        const rating = responseToRating(responseData);
        const updatedCard = fsrs.schedule(newCard, rating, now);

        mastery = await prisma.masteryState.create({
          data: {
            objectId,
            stage: responseData.correct ? 1 : 0,
            stability: updatedCard.stability,
            difficulty: updatedCard.difficulty,
            cueFreeAccuracy: cueLevel === 0 ? (correct ? 1 : 0) : 0,
            cueAssistedAccuracy: cueLevel > 0 ? (correct ? 1 : 0) : 0,
            exposureCount: 1,
            lastReview: now,
            nextReview: fsrs.nextReviewDate(updatedCard),
            reps: 1,
            lapses: correct ? 0 : 1,
          },
        });
      } else {
        // Update existing mastery
        const existingCard = {
          difficulty: mastery.difficulty,
          stability: mastery.stability,
          lastReview: mastery.lastReview,
          reps: mastery.reps,
          lapses: mastery.lapses,
          state: mastery.reps === 0 ? 'new' as const : 'review' as const,
        };

        const rating = responseToRating(responseData);
        const updatedCard = fsrs.schedule(existingCard, rating, now);

        // Calculate updated accuracy with recency weighting
        const weight = 1 / (mastery.exposureCount * 0.3 + 1);
        let newCueFreeAccuracy = mastery.cueFreeAccuracy;
        let newCueAssistedAccuracy = mastery.cueAssistedAccuracy;

        if (cueLevel === 0) {
          newCueFreeAccuracy = (1 - weight) * mastery.cueFreeAccuracy + weight * (correct ? 1 : 0);
        } else {
          newCueAssistedAccuracy = (1 - 0.2) * mastery.cueAssistedAccuracy + 0.2 * (correct ? 1 : 0);
        }

        // Determine stage
        const gap = newCueAssistedAccuracy - newCueFreeAccuracy;
        let newStage = mastery.stage;

        if (newCueFreeAccuracy >= 0.9 && updatedCard.stability > 30 && gap < 0.1) {
          newStage = 4;
        } else if (newCueFreeAccuracy >= 0.75 && updatedCard.stability > 7) {
          newStage = 3;
        } else if (newCueFreeAccuracy >= 0.6 || newCueAssistedAccuracy >= 0.8) {
          newStage = 2;
        } else if (newCueAssistedAccuracy >= 0.5) {
          newStage = 1;
        }

        mastery = await prisma.masteryState.update({
          where: { objectId },
          data: {
            stage: newStage,
            stability: updatedCard.stability,
            difficulty: updatedCard.difficulty,
            cueFreeAccuracy: newCueFreeAccuracy,
            cueAssistedAccuracy: newCueAssistedAccuracy,
            exposureCount: mastery.exposureCount + 1,
            lastReview: now,
            nextReview: fsrs.nextReviewDate(updatedCard),
            reps: updatedCard.reps,
            lapses: updatedCard.lapses,
          },
        });
      }

      // Update user theta if we have enough responses
      const recentResponses = await prisma.response.findMany({
        where: { session: { goalId: (await prisma.session.findUnique({ where: { id: sessionId } }))?.goalId } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { object: true },
      });

      if (recentResponses.length >= 10) {
        // Build IRT item parameters and response array for theta estimation
        const items = recentResponses.map((r: { object: { irtDifficulty: number; irtDiscrimination?: number | null } }) => ({
          id: r.object.irtDifficulty.toString(),
          a: r.object.irtDiscrimination ?? 1.0, // discrimination parameter
          b: r.object.irtDifficulty, // difficulty parameter
        }));
        const responseArray = recentResponses.map((r: { correct: boolean }) => r.correct);

        const estimate = estimateThetaMLE(responseArray, items);

        await prisma.user.updateMany({
          data: { globalTheta: estimate.theta },
        });
      }

      return success({
        responseId: response.id,
        mastery: {
          stage: mastery.stage,
          stability: mastery.stability,
          nextReview: mastery.nextReview,
          cueFreeAccuracy: mastery.cueFreeAccuracy,
        },
        fsrsRating: responseToRating(responseData),
      });
    } catch (err) {
      console.error('Failed to record response:', err);
      return error('Failed to record response');
    }
  });

  // List sessions
  registerHandler('session:list', async (_event, request) => {
    const { goalId, limit, offset } = request as {
      goalId: string;
      limit?: number;
      offset?: number;
    };

    const goalError = validateUUID(goalId, 'goalId');
    if (goalError) return error(goalError);

    try {
      const sessions = await prisma.session.findMany({
        where: { goalId },
        include: {
          _count: { select: { responses: true } },
          responses: {
            select: { correct: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: limit || 20,
        skip: offset || 0,
      });

      return success(sessions.map(s => {
        const correct = s.responses.filter(r => r.correct).length;
        const total = s.responses.length;
        return {
          id: s.id,
          mode: s.mode,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          durationMinutes: s.endedAt
            ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 1000 / 60 * 10) / 10
            : 0,
          itemsPracticed: s.itemsPracticed,
          stageTransitions: s.stageTransitions,
          responseCount: total,
          accuracy: total > 0 ? correct / total : 0,
        };
      }));
    } catch (err) {
      console.error('Failed to list sessions:', err);
      return error('Failed to list sessions');
    }
  });

  // Get next task
  registerHandler('session:get-next-task', async (_event, request) => {
    const { sessionId } = request as { sessionId: string };

    const idError = validateUUID(sessionId, 'sessionId');
    if (idError) return error(idError);

    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { goalId: true },
      });

      if (!session) {
        return error('Session not found');
      }

      // Get next item based on priority and due date
      const nextItem = await prisma.languageObject.findFirst({
        where: { goalId: session.goalId },
        include: { mastery: true },
        orderBy: [
          { priority: 'desc' },
        ],
      });

      if (!nextItem) {
        return success(null);
      }

      return success({
        objectId: nextItem.id,
        content: nextItem.content,
        type: nextItem.type,
        masteryStage: nextItem.mastery?.stage ?? 0,
        difficulty: nextItem.irtDifficulty,
      });
    } catch (err) {
      console.error('Failed to get next task:', err);
      return error('Failed to get next task');
    }
  });

  // Get session summary
  registerHandler('session:get-summary', async (_event, request) => {
    const { sessionId } = request as { sessionId: string };

    const idError = validateUUID(sessionId, 'sessionId');
    if (idError) return error(idError);

    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          responses: {
            include: { object: true },
          },
        },
      });

      if (!session) {
        return error('Session not found');
      }

      const totalResponses = session.responses.length;
      const correctResponses = session.responses.filter(r => r.correct).length;
      const cueFreeResponses = session.responses.filter(r => r.cueLevel === 0);
      const cueFreeCorrect = cueFreeResponses.filter(r => r.correct).length;

      const duration = session.endedAt
        ? (session.endedAt.getTime() - session.startedAt.getTime()) / 1000 / 60
        : (new Date().getTime() - session.startedAt.getTime()) / 1000 / 60;

      return success({
        sessionId: session.id,
        mode: session.mode,
        durationMinutes: Math.round(duration * 10) / 10,
        itemsPracticed: session.itemsPracticed,
        stageTransitions: session.stageTransitions,
        totalResponses,
        correctResponses,
        accuracy: totalResponses > 0 ? correctResponses / totalResponses : 0,
        cueFreeAccuracy: cueFreeResponses.length > 0 ? cueFreeCorrect / cueFreeResponses.length : 0,
      });
    } catch (err) {
      console.error('Failed to get session summary:', err);
      return error('Failed to get session summary');
    }
  });

  // Get progress analytics
  registerHandler('analytics:get-progress', async (_event, request) => {
    const { goalId, timeRange } = request as {
      goalId: string;
      timeRange?: 'day' | 'week' | 'month' | 'all';
    };

    const goalError = validateUUID(goalId, 'goalId');
    if (goalError) return error(goalError);

    try {
      const now = new Date();
      let startDate: Date | undefined;

      switch (timeRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const whereClause = {
        session: { goalId },
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      };

      const responses = await prisma.response.findMany({
        where: whereClause,
        include: { object: true },
      });

      const objects = await prisma.languageObject.findMany({
        where: { goalId },
        include: { mastery: true },
      });

      // Calculate stats
      const totalResponses = responses.length;
      const correctResponses = responses.filter(r => r.correct).length;
      const cueFreeResponses = responses.filter(r => r.cueLevel === 0);
      const cueFreeCorrect = cueFreeResponses.filter(r => r.correct).length;

      const stageDistribution = [0, 0, 0, 0, 0];
      for (const obj of objects) {
        const stage = obj.mastery?.stage ?? 0;
        stageDistribution[stage]++;
      }

      return success({
        totalObjects: objects.length,
        totalResponses,
        accuracy: totalResponses > 0 ? correctResponses / totalResponses : 0,
        cueFreeAccuracy: cueFreeResponses.length > 0 ? cueFreeCorrect / cueFreeResponses.length : 0,
        stageDistribution,
        masteredCount: stageDistribution[3] + stageDistribution[4],
        learningCount: stageDistribution[1] + stageDistribution[2],
        newCount: stageDistribution[0],
      });
    } catch (err) {
      console.error('Failed to get progress:', err);
      return error('Failed to get progress analytics');
    }
  });

  // Get bottleneck analysis
  registerHandler('analytics:get-bottlenecks', async (_event, request) => {
    const { goalId, minResponses } = request as {
      goalId: string;
      minResponses?: number;
    };

    const goalError = validateUUID(goalId, 'goalId');
    if (goalError) return error(goalError);

    try {
      const responses = await prisma.response.findMany({
        where: {
          session: { goalId },
          correct: false,
          errorComponents: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      // Convert to bottleneck response format
      const bottleneckResponses: BottleneckResponse[] = responses.map(r => ({
        objectId: r.objectId,
        correct: r.correct,
        errorComponent: (r.errorComponents?.split(',')[0] || 'LEX') as ComponentType,
        timestamp: r.createdAt,
        responseTimeMs: r.responseTimeMs,
      }));

      const analysis = analyzeBottleneck(bottleneckResponses, {
        minResponses: minResponses ?? 10,
        confidenceThreshold: 0.6,
        recentWindowDays: 14,
      });

      return success(analysis);
    } catch (err) {
      console.error('Failed to get bottlenecks:', err);
      return error('Failed to analyze bottlenecks');
    }
  });

  // Get session stats (analytics:get-history)
  registerHandler('analytics:get-history', async (_event, request) => {
    const { goalId, days } = request as {
      goalId: string;
      days?: number;
    };

    const goalError = validateUUID(goalId, 'goalId');
    if (goalError) return error(goalError);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days || 30));

      const sessions = await prisma.session.findMany({
        where: {
          goalId,
          startedAt: { gte: startDate },
          endedAt: { not: null },
        },
        include: {
          responses: { select: { correct: true, responseTimeMs: true } },
        },
      });

      const totalSessions = sessions.length;
      const totalTime = sessions.reduce((sum, s) => {
        if (!s.endedAt) return sum;
        return sum + (s.endedAt.getTime() - s.startedAt.getTime()) / 1000 / 60;
      }, 0);
      const avgSessionLength = totalSessions > 0 ? totalTime / totalSessions : 0;

      const allResponses = sessions.flatMap(s => s.responses);
      const avgResponseTime = allResponses.length > 0
        ? allResponses.reduce((sum, r) => sum + r.responseTimeMs, 0) / allResponses.length
        : 0;

      // Calculate streak
      const sessionDates = sessions
        .map(s => s.startedAt.toISOString().split('T')[0])
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()
        .reverse();

      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < sessionDates.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        if (sessionDates[i] === expectedDate.toISOString().split('T')[0]) {
          streak++;
        } else {
          break;
        }
      }

      return success({
        totalSessions,
        totalTimeMinutes: Math.round(totalTime),
        avgSessionLengthMinutes: Math.round(avgSessionLength * 10) / 10,
        avgResponseTimeMs: Math.round(avgResponseTime),
        currentStreak: streak,
        responsesPerSession: totalSessions > 0 ? Math.round(allResponses.length / totalSessions) : 0,
      });
    } catch (err) {
      console.error('Failed to get session stats:', err);
      return error('Failed to get session stats');
    }
  });
}

export function unregisterSessionHandlers(): void {
  const { unregisterHandler } = require('./contracts') as { unregisterHandler: (channel: string) => void };
  const channels = [
    'session:start',
    'session:end',
    'session:get-state',
    'session:get-next-task',
    'session:get-summary',
    'session:submit-response',
    'session:list',
    'analytics:get-progress',
    'analytics:get-bottlenecks',
    'analytics:get-history',
  ];
  channels.forEach(unregisterHandler);
}

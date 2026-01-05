/**
 * Goal Repository
 *
 * Data access layer for GoalSpec and related operations.
 * Implements Phase 2.1: Goal Management.
 */

import type { GoalSpec, LanguageObject, Prisma } from '@prisma/client';
import { getPrisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface CreateGoalInput {
  userId: string;
  domain: string;
  modality: string[]; // Will be JSON stringified
  genre: string;
  purpose: string;
  benchmark?: string;
  deadline?: Date;
}

export interface UpdateGoalInput {
  domain?: string;
  modality?: string[];
  genre?: string;
  purpose?: string;
  benchmark?: string | null;
  deadline?: Date | null;
  completionPercent?: number;
  isActive?: boolean;
}

export interface GoalWithObjects extends GoalSpec {
  languageObjects: LanguageObject[];
  _count: {
    languageObjects: number;
    sessions: number;
  };
}

export interface GoalProgress {
  goalId: string;
  totalObjects: number;
  masteredObjects: number;
  inProgressObjects: number;
  newObjects: number;
  averageMastery: number;
  completionPercent: number;
}

// =============================================================================
// Repository Functions
// =============================================================================

/**
 * Create a new goal for a user.
 */
export async function createGoal(input: CreateGoalInput): Promise<GoalSpec> {
  const db = getPrisma();

  return db.goalSpec.create({
    data: {
      userId: input.userId,
      domain: input.domain,
      modality: JSON.stringify(input.modality),
      genre: input.genre,
      purpose: input.purpose,
      benchmark: input.benchmark,
      deadline: input.deadline,
    },
  });
}

/**
 * Get a goal by ID.
 */
export async function getGoalById(goalId: string): Promise<GoalSpec | null> {
  const db = getPrisma();

  return db.goalSpec.findUnique({
    where: { id: goalId },
  });
}

/**
 * Get a goal with its language objects.
 */
export async function getGoalWithObjects(
  goalId: string,
  objectLimit?: number
): Promise<GoalWithObjects | null> {
  const db = getPrisma();

  return db.goalSpec.findUnique({
    where: { id: goalId },
    include: {
      languageObjects: {
        take: objectLimit,
        orderBy: { priority: 'desc' },
      },
      _count: {
        select: {
          languageObjects: true,
          sessions: true,
        },
      },
    },
  });
}

/**
 * Get all goals for a user.
 */
export async function getGoalsByUser(
  userId: string,
  activeOnly: boolean = true
): Promise<GoalSpec[]> {
  const db = getPrisma();

  return db.goalSpec.findMany({
    where: {
      userId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Update a goal.
 */
export async function updateGoal(
  goalId: string,
  input: UpdateGoalInput
): Promise<GoalSpec> {
  const db = getPrisma();

  const data: Prisma.GoalSpecUpdateInput = {};

  if (input.domain !== undefined) data.domain = input.domain;
  if (input.modality !== undefined) data.modality = JSON.stringify(input.modality);
  if (input.genre !== undefined) data.genre = input.genre;
  if (input.purpose !== undefined) data.purpose = input.purpose;
  if (input.benchmark !== undefined) data.benchmark = input.benchmark;
  if (input.deadline !== undefined) data.deadline = input.deadline;
  if (input.completionPercent !== undefined) data.completionPercent = input.completionPercent;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return db.goalSpec.update({
    where: { id: goalId },
    data,
  });
}

/**
 * Delete a goal and all associated data.
 */
export async function deleteGoal(goalId: string): Promise<void> {
  const db = getPrisma();

  await db.goalSpec.delete({
    where: { id: goalId },
  });
}

/**
 * Calculate goal progress from mastery states.
 */
export async function calculateGoalProgress(goalId: string): Promise<GoalProgress> {
  const db = getPrisma();

  const objects = await db.languageObject.findMany({
    where: { goalId },
    include: { masteryState: true },
  });

  const totalObjects = objects.length;
  let masteredObjects = 0;
  let inProgressObjects = 0;
  let newObjects = 0;
  let totalMastery = 0;

  for (const obj of objects) {
    const stage = obj.masteryState?.stage ?? 0;
    totalMastery += stage;

    if (stage >= 4) {
      masteredObjects++;
    } else if (stage > 0) {
      inProgressObjects++;
    } else {
      newObjects++;
    }
  }

  const averageMastery = totalObjects > 0 ? totalMastery / totalObjects : 0;
  const completionPercent = totalObjects > 0 ? (masteredObjects / totalObjects) * 100 : 0;

  // Update the goal's completion percent
  await db.goalSpec.update({
    where: { id: goalId },
    data: { completionPercent },
  });

  return {
    goalId,
    totalObjects,
    masteredObjects,
    inProgressObjects,
    newObjects,
    averageMastery,
    completionPercent,
  };
}

/**
 * Add language objects to a goal.
 */
export async function addLanguageObjectsToGoal(
  goalId: string,
  objects: Array<{
    type: string;
    content: string;
    frequency: number;
    relationalDensity: number;
    contextualContribution: number;
    domainDistribution?: Record<string, number>;
    morphologicalScore?: number;
    phonologicalDifficulty?: number;
    priority?: number;
    irtDifficulty?: number;
    irtDiscrimination?: number;
  }>
): Promise<number> {
  const db = getPrisma();

  const result = await db.languageObject.createMany({
    data: objects.map((obj) => ({
      goalId,
      type: obj.type,
      content: obj.content,
      frequency: obj.frequency,
      relationalDensity: obj.relationalDensity,
      contextualContribution: obj.contextualContribution,
      domainDistribution: obj.domainDistribution ? JSON.stringify(obj.domainDistribution) : null,
      morphologicalScore: obj.morphologicalScore,
      phonologicalDifficulty: obj.phonologicalDifficulty,
      priority: obj.priority ?? 0,
      irtDifficulty: obj.irtDifficulty ?? 0,
      irtDiscrimination: obj.irtDiscrimination ?? 1,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

/**
 * Get language objects for a goal with filtering.
 */
export async function getLanguageObjects(
  goalId: string,
  options?: {
    type?: string;
    minPriority?: number;
    limit?: number;
    offset?: number;
  }
): Promise<LanguageObject[]> {
  const db = getPrisma();

  return db.languageObject.findMany({
    where: {
      goalId,
      ...(options?.type ? { type: options.type } : {}),
      ...(options?.minPriority !== undefined ? { priority: { gte: options.minPriority } } : {}),
    },
    orderBy: { priority: 'desc' },
    take: options?.limit,
    skip: options?.offset,
  });
}

/**
 * Update language object priority.
 */
export async function updateObjectPriority(
  objectId: string,
  priority: number
): Promise<void> {
  const db = getPrisma();

  await db.languageObject.update({
    where: { id: objectId },
    data: { priority },
  });
}

/**
 * Bulk update priorities for multiple objects.
 */
export async function bulkUpdatePriorities(
  updates: Array<{ objectId: string; priority: number }>
): Promise<void> {
  const db = getPrisma();

  await db.$transaction(
    updates.map(({ objectId, priority }) =>
      db.languageObject.update({
        where: { id: objectId },
        data: { priority },
      })
    )
  );
}

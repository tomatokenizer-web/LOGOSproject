/**
 * Goal IPC Handlers
 *
 * Handles all goal-related IPC communication between renderer and main process.
 * Goals represent learning objectives with domain, modality, genre, and purpose specs.
 */

import { registerHandler, success, error, validateNonEmpty, validateUUID } from './contracts';
import { prisma } from '../db/client';
import type { GoalSpec, Domain, Modality } from '../../shared/types';

// ============================================================================
// Type Guards and Validation
// ============================================================================

const VALID_DOMAINS: Domain[] = ['medical', 'legal', 'business', 'academic', 'general'];
const VALID_MODALITIES: Modality[] = ['reading', 'listening', 'writing', 'speaking'];

function isValidDomain(value: string): value is Domain {
  return VALID_DOMAINS.includes(value as Domain);
}

function isValidModality(value: string): value is Modality {
  return VALID_MODALITIES.includes(value as Modality);
}

function validateModalities(modalities: unknown): string | null {
  if (!Array.isArray(modalities) || modalities.length === 0) {
    return 'modality must be a non-empty array';
  }
  for (const mod of modalities) {
    if (!isValidModality(mod)) {
      return `Invalid modality: ${mod}. Valid options: ${VALID_MODALITIES.join(', ')}`;
    }
  }
  return null;
}

function validateDomain(domain: unknown): string | null {
  if (typeof domain !== 'string' || !isValidDomain(domain)) {
    return `Invalid domain. Valid options: ${VALID_DOMAINS.join(', ')}`;
  }
  return null;
}

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register all goal-related IPC handlers.
 */
export function registerGoalHandlers(): void {
  // Create a new goal
  registerHandler('goal:create', async (_event, request) => {
    const { domain, modality, genre, purpose, benchmark, deadline } = request as {
      domain: string;
      modality: string[];
      genre: string;
      purpose: string;
      benchmark?: string;
      deadline?: string;
    };

    // Validate required fields
    const domainError = validateDomain(domain);
    if (domainError) return error(domainError);

    const modalityError = validateModalities(modality);
    if (modalityError) return error(modalityError);

    const genreError = validateNonEmpty(genre, 'genre');
    if (genreError) return error(genreError);

    const purposeError = validateNonEmpty(purpose, 'purpose');
    if (purposeError) return error(purposeError);

    try {
      // Get or create default user (temporary until auth is implemented)
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'default@logos.local',
            name: 'Default User',
          },
        });
      }

      const goal = await prisma.goalSpec.create({
        data: {
          domain: domain.toLowerCase(),
          modality: JSON.stringify(modality.map((m: string) => m.toLowerCase())),
          genre: genre.trim(),
          purpose: purpose.trim(),
          benchmark: benchmark?.trim() || null,
          deadline: deadline ? new Date(deadline) : null,
          completionPercent: 0,
          isActive: true,
          userId: user.id,
        },
      });

      return success(mapGoalToResponse(goal));
    } catch (err) {
      console.error('Failed to create goal:', err);
      return error('Failed to create goal');
    }
  });

  // Get a single goal by ID
  registerHandler('goal:get', async (_event, request) => {
    const { id } = request as { id: string };

    const idError = validateUUID(id, 'id');
    if (idError) return error(idError);

    try {
      const goal = await prisma.goalSpec.findUnique({
        where: { id },
        include: {
          _count: {
            select: { languageObjects: true, sessions: true },
          },
        },
      });

      if (!goal) {
        return error('Goal not found');
      }

      return success(mapGoalToResponse(goal));
    } catch (err) {
      console.error('Failed to get goal:', err);
      return error('Failed to get goal');
    }
  });

  // List all goals
  registerHandler('goal:list', async (_event, request) => {
    const { activeOnly, limit, offset } = (request as {
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    }) || {};

    try {
      const where = activeOnly ? { isActive: true } : {};

      const [goals, total] = await Promise.all([
        prisma.goalSpec.findMany({
          where,
          include: {
            _count: {
              select: { languageObjects: true, sessions: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.goalSpec.count({ where }),
      ]);

      return success({
        goals: goals.map(mapGoalToResponse),
        total,
      });
    } catch (err) {
      console.error('Failed to list goals:', err);
      return error('Failed to list goals');
    }
  });

  // Update a goal
  registerHandler('goal:update', async (_event, request) => {
    const { id, updates } = request as {
      id: string;
      updates: {
        domain?: string;
        modality?: string[];
        genre?: string;
        purpose?: string;
        benchmark?: string;
        deadline?: string;
      };
    };

    const idError = validateUUID(id, 'id');
    if (idError) return error(idError);

    // Build update data, only including provided fields
    const updateData: Record<string, unknown> = {};

    if (updates.domain !== undefined) {
      const domainError = validateDomain(updates.domain);
      if (domainError) return error(domainError);
      updateData.domain = updates.domain.toLowerCase();
    }

    if (updates.modality !== undefined) {
      const modalityError = validateModalities(updates.modality);
      if (modalityError) return error(modalityError);
      updateData.modality = JSON.stringify(updates.modality.map((m) => m.toLowerCase()));
    }

    if (updates.genre !== undefined) {
      const genreError = validateNonEmpty(updates.genre, 'genre');
      if (genreError) return error(genreError);
      updateData.genre = updates.genre.trim();
    }

    if (updates.purpose !== undefined) {
      const purposeError = validateNonEmpty(updates.purpose, 'purpose');
      if (purposeError) return error(purposeError);
      updateData.purpose = updates.purpose.trim();
    }

    if (updates.benchmark !== undefined) {
      updateData.benchmark = updates.benchmark?.trim() || null;
    }

    if (updates.deadline !== undefined) {
      updateData.deadline = updates.deadline ? new Date(updates.deadline) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update');
    }

    try {
      const goal = await prisma.goalSpec.update({
        where: { id },
        data: updateData,
      });

      return success(mapGoalToResponse(goal));
    } catch (err) {
      console.error('Failed to update goal:', err);
      return error('Failed to update goal');
    }
  });

  // Delete a goal
  registerHandler('goal:delete', async (_event, request) => {
    const { id } = request as { id: string };

    const idError = validateUUID(id, 'id');
    if (idError) return error(idError);

    try {
      await prisma.goalSpec.delete({
        where: { id },
      });

      return success({ deleted: true });
    } catch (err) {
      console.error('Failed to delete goal:', err);
      return error('Failed to delete goal');
    }
  });

  // Set goal active status
  registerHandler('goal:set-active', async (_event, request) => {
    const { id, active } = request as { id: string; active: boolean };

    const idError = validateUUID(id, 'id');
    if (idError) return error(idError);

    if (typeof active !== 'boolean') {
      return error('active must be a boolean');
    }

    try {
      const goal = await prisma.goalSpec.update({
        where: { id },
        data: { isActive: active },
      });

      return success(mapGoalToResponse(goal));
    } catch (err) {
      console.error('Failed to set goal active status:', err);
      return error('Failed to set goal active status');
    }
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Prisma goal to GoalSpec response type.
 */
function mapGoalToResponse(goal: {
  id: string;
  domain: string;
  modality: string;
  genre: string;
  purpose: string;
  benchmark: string | null;
  deadline: Date | null;
  completionPercent: number;
  isActive: boolean;
  userId: string;
  _count?: { languageObjects: number; sessions: number };
}): GoalSpec {
  // Parse modality from JSON string
  let parsedModality: Modality[];
  try {
    parsedModality = JSON.parse(goal.modality) as Modality[];
  } catch {
    parsedModality = [goal.modality as Modality];
  }

  return {
    id: goal.id,
    domain: goal.domain as Domain,
    modality: parsedModality,
    genre: goal.genre,
    purpose: goal.purpose,
    benchmark: goal.benchmark || undefined,
    deadline: goal.deadline || undefined,
    completionPercent: goal.completionPercent,
    isActive: goal.isActive,
    userId: goal.userId,
  };
}

/**
 * Unregister all goal handlers (for cleanup/testing).
 */
export function unregisterGoalHandlers(): void {
  const { unregisterHandler } = require('./contracts') as { unregisterHandler: (channel: string) => void };
  unregisterHandler('goal:create');
  unregisterHandler('goal:get');
  unregisterHandler('goal:list');
  unregisterHandler('goal:update');
  unregisterHandler('goal:delete');
  unregisterHandler('goal:set-active');
}

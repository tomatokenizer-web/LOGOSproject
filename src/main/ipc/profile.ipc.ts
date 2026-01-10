/**
 * Profile IPC Handlers
 *
 * Handles user profile operations - get profile, update profile,
 * get settings, and update settings.
 *
 * Note: Settings are stored in-memory or via electron-store (future).
 * Current schema only stores user profile and theta values.
 */

import { registerDynamicHandler, success, error, unregisterHandler } from './contracts';
import { prisma } from '../db/client';
import type { User, UserSettings, UserFREWeights } from '../../shared/types';

// =============================================================================
// Types
// =============================================================================

interface ProfileUpdateRequest {
  nativeLanguage?: string;
  targetLanguage?: string;
}

// =============================================================================
// Constants
// =============================================================================

const VALID_THEMES = ['light', 'dark', 'system'] as const;
const LANGUAGE_CODE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

// In-memory settings storage (per-session, future: use electron-store for persistence)
let cachedSettings: UserSettings = {
  dailyGoal: 30,
  sessionLength: 20,
  notificationsEnabled: true,
  soundEnabled: true,
  theme: 'system',
  targetRetention: 0.9,
  priorityWeights: null,  // null = use level-based defaults from priority.ts
};

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate language code format (BCP-47: xx or xx-XX).
 */
function isValidLanguageCode(code: string): boolean {
  return typeof code === 'string' && LANGUAGE_CODE_PATTERN.test(code);
}

/**
 * Validate theme value.
 */
function isValidTheme(theme: unknown): theme is typeof VALID_THEMES[number] {
  return typeof theme === 'string' && VALID_THEMES.includes(theme as typeof VALID_THEMES[number]);
}

/**
 * Validate numeric range.
 */
function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * Validate priority weights (f, r, e must be 0-1 and sum to ~1).
 */
function isValidPriorityWeights(weights: unknown): weights is UserFREWeights {
  if (!weights || typeof weights !== 'object') return false;
  const w = weights as Record<string, unknown>;
  if (typeof w.f !== 'number' || typeof w.r !== 'number' || typeof w.e !== 'number') return false;
  if (!isInRange(w.f, 0, 1) || !isInRange(w.r, 0, 1) || !isInRange(w.e, 0, 1)) return false;
  const sum = w.f + w.r + w.e;
  return sum >= 0.99 && sum <= 1.01;  // Allow small floating point tolerance
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert Prisma user to API User type.
 * Maps schema column names to API field names.
 */
function toUser(prismaUser: {
  id: string;
  nativeLanguage: string;
  targetLanguage: string;
  thetaGlobal: number;
  thetaPhonology: number;
  thetaMorphology: number;
  thetaLexical: number;
  thetaSyntactic: number;
  thetaPragmatic: number;
  createdAt: Date;
}): User {
  return {
    id: prismaUser.id,
    nativeLanguage: prismaUser.nativeLanguage,
    targetLanguage: prismaUser.targetLanguage,
    theta: {
      thetaGlobal: prismaUser.thetaGlobal,
      thetaPhonology: prismaUser.thetaPhonology,
      thetaMorphology: prismaUser.thetaMorphology,
      thetaLexical: prismaUser.thetaLexical,
      thetaSyntactic: prismaUser.thetaSyntactic,
      thetaPragmatic: prismaUser.thetaPragmatic,
    },
    createdAt: prismaUser.createdAt,
    settings: {
      theme: cachedSettings.theme,
      dailyGoal: cachedSettings.dailyGoal,
      sessionLength: cachedSettings.sessionLength,
      notificationsEnabled: cachedSettings.notificationsEnabled,
      soundEnabled: cachedSettings.soundEnabled,
      targetRetention: cachedSettings.targetRetention,
      priorityWeights: cachedSettings.priorityWeights,
    },
  };
}

/**
 * Get default user structure.
 */
function getDefaultUser(): User {
  return {
    id: 'default',
    nativeLanguage: 'en',
    targetLanguage: 'en',
    theta: {
      thetaGlobal: 0,
      thetaPhonology: 0,
      thetaMorphology: 0,
      thetaLexical: 0,
      thetaSyntactic: 0,
      thetaPragmatic: 0,
    },
    createdAt: new Date(),
    settings: {
      theme: 'system',
      dailyGoal: 30,
      sessionLength: 20,
      notificationsEnabled: true,
      soundEnabled: true,
      targetRetention: 0.9,
      priorityWeights: null,
    },
  };
}

/**
 * Get default settings.
 */
function getDefaultSettings(): UserSettings {
  return {
    dailyGoal: 30,
    sessionLength: 20,
    notificationsEnabled: true,
    soundEnabled: true,
    theme: 'system',
    targetRetention: 0.9,
    priorityWeights: null,
  };
}

// =============================================================================
// Handler Registration
// =============================================================================

/**
 * Register all profile-related IPC handlers.
 */
export function registerProfileHandlers(): void {
  /**
   * Get user profile.
   * Returns the current user's profile or a default if not found.
   */
  registerDynamicHandler('profile:get', async () => {
    try {
      const user = await prisma.user.findFirst();

      if (!user) {
        return success(getDefaultUser());
      }

      return success(toUser(user));
    } catch (err) {
      console.error('Failed to get user profile:', err instanceof Error ? err.message : 'Unknown error');
      return error('Failed to get user profile');
    }
  });

  /**
   * Update user profile.
   * Updates native language, target language, or other profile fields.
   */
  registerDynamicHandler('profile:update', async (_event, request) => {
    try {
      const data = request as ProfileUpdateRequest;

      // Validate language codes if provided
      if (data.nativeLanguage !== undefined) {
        if (!isValidLanguageCode(data.nativeLanguage)) {
          return error(`Invalid native language code: ${data.nativeLanguage}. Expected format: 'en' or 'en-US'`);
        }
      }
      if (data.targetLanguage !== undefined) {
        if (!isValidLanguageCode(data.targetLanguage)) {
          return error(`Invalid target language code: ${data.targetLanguage}. Expected format: 'ko' or 'ko-KR'`);
        }
      }

      // Find existing user or create default
      let user = await prisma.user.findFirst();

      if (!user) {
        // Create new user with provided data
        user = await prisma.user.create({
          data: {
            nativeLanguage: data.nativeLanguage || 'en',
            targetLanguage: data.targetLanguage || 'en',
            thetaGlobal: 0,
            thetaPhonology: 0,
            thetaMorphology: 0,
            thetaLexical: 0,
            thetaSyntactic: 0,
            thetaPragmatic: 0,
          },
        });
      } else {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(data.nativeLanguage && { nativeLanguage: data.nativeLanguage }),
            ...(data.targetLanguage && { targetLanguage: data.targetLanguage }),
          },
        });
      }

      return success(toUser(user));
    } catch (err) {
      console.error('Failed to update user profile:', err instanceof Error ? err.message : 'Unknown error');
      return error('Failed to update user profile');
    }
  });

  /**
   * Get user settings.
   * Returns application settings (stored in-memory, not in database).
   */
  registerDynamicHandler('profile:getSettings', async () => {
    try {
      return success({ ...cachedSettings });
    } catch (err) {
      console.error('Failed to get user settings:', err instanceof Error ? err.message : 'Unknown error');
      return error('Failed to get user settings');
    }
  });

  /**
   * Update user settings.
   * Updates application settings (stored in-memory).
   */
  registerDynamicHandler('profile:updateSettings', async (_event, request) => {
    try {
      const settings = request as Partial<UserSettings>;

      // Validate theme if provided
      if (settings.theme !== undefined && !isValidTheme(settings.theme)) {
        return error(`Invalid theme value: ${settings.theme}. Expected: light, dark, or system`);
      }

      // Validate numeric ranges
      if (settings.dailyGoal !== undefined && !isInRange(settings.dailyGoal, 5, 480)) {
        return error('dailyGoal must be between 5 and 480');
      }
      if (settings.sessionLength !== undefined && !isInRange(settings.sessionLength, 5, 120)) {
        return error('sessionLength must be between 5 and 120');
      }
      if (settings.targetRetention !== undefined && !isInRange(settings.targetRetention, 0.7, 0.99)) {
        return error('targetRetention must be between 0.7 and 0.99');
      }

      // Validate priorityWeights if provided (null is valid - means use defaults)
      if (settings.priorityWeights !== undefined && settings.priorityWeights !== null) {
        if (!isValidPriorityWeights(settings.priorityWeights)) {
          return error('priorityWeights must have f, r, e values between 0-1 that sum to 1');
        }
      }

      // Update cached settings
      cachedSettings = {
        dailyGoal: settings.dailyGoal ?? cachedSettings.dailyGoal,
        sessionLength: settings.sessionLength ?? cachedSettings.sessionLength,
        notificationsEnabled: settings.notificationsEnabled ?? cachedSettings.notificationsEnabled,
        soundEnabled: settings.soundEnabled ?? cachedSettings.soundEnabled,
        theme: settings.theme ?? cachedSettings.theme,
        targetRetention: settings.targetRetention ?? cachedSettings.targetRetention,
        priorityWeights: settings.priorityWeights !== undefined
          ? settings.priorityWeights
          : cachedSettings.priorityWeights,
      };

      return success({ ...cachedSettings });
    } catch (err) {
      console.error('Failed to update user settings:', err instanceof Error ? err.message : 'Unknown error');
      return error('Failed to update user settings');
    }
  });

  console.log('[IPC] Profile handlers registered');
}

/**
 * Unregister all profile handlers (for cleanup/testing).
 */
export function unregisterProfileHandlers(): void {
  unregisterHandler('profile:get');
  unregisterHandler('profile:update');
  unregisterHandler('profile:getSettings');
  unregisterHandler('profile:updateSettings');
}

// =============================================================================
// Exported Utilities (for use by other IPC handlers)
// =============================================================================

/**
 * Get current user's priority weights.
 * Returns null if user hasn't customized weights (use level-based defaults).
 */
export function getUserPriorityWeights(): UserFREWeights | null {
  return cachedSettings.priorityWeights;
}

/**
 * Get current target retention setting.
 */
export function getUserTargetRetention(): number {
  return cachedSettings.targetRetention;
}

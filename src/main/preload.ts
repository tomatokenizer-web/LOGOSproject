/**
 * Preload Script
 *
 * Exposes a safe, limited API to the renderer process via contextBridge.
 * This is the ONLY way the renderer can communicate with the main process.
 *
 * Security: All IPC calls go through ipcRenderer.invoke() which is async
 * and prevents direct access to Node.js APIs from the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { LogosAPI } from '../shared/types';

/**
 * Type-safe IPC invoke wrapper.
 */
async function invoke<T>(channel: string, request?: unknown): Promise<T> {
  const response = await ipcRenderer.invoke(channel, request);
  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }
  return response.data as T;
}

/**
 * LOGOS API exposed to renderer process.
 */
const logosAPI: LogosAPI = {
  // ============================================================================
  // Goal Management
  // ============================================================================

  goal: {
    create: (data) => invoke('goal:create', data),
    get: (id) => invoke('goal:get', { id }),
    list: (includeInactive) => invoke('goal:list', { includeInactive }),
    update: (data) => invoke('goal:update', data),
    delete: (id, hard) => invoke('goal:delete', { id, hard }),
  },

  // ============================================================================
  // Learning Object Management
  // ============================================================================

  object: {
    create: (data) => invoke('object:create', data),
    get: (id) => invoke('object:get', { id }),
    list: (goalId, options) => invoke('object:list', { goalId, ...options }),
    update: (data) => invoke('object:update', data),
    delete: (id) => invoke('object:delete', { id }),
    import: (goalId, objects) => invoke('object:import', { goalId, objects }),
  },

  // ============================================================================
  // Session Management
  // ============================================================================

  session: {
    start: (goalId, sessionType, targetDuration) =>
      invoke('session:start', { goalId, sessionType, targetDuration }),
    end: (sessionId) => invoke('session:end', { sessionId }),
    getCurrent: (goalId) => invoke('session:getCurrent', { goalId }),
    recordResponse: (data) => invoke('session:recordResponse', data),
    getHistory: (goalId, options) => invoke('session:getHistory', { goalId, ...options }),
  },

  // ============================================================================
  // Queue Management
  // ============================================================================

  queue: {
    build: (goalId, options) => invoke('queue:build', { goalId, ...options }),
    getNext: (goalId, excludeIds) => invoke('queue:getNext', { goalId, excludeIds }),
    refresh: (goalId) => invoke('queue:refresh', { goalId }),
  },

  // ============================================================================
  // Mastery Management
  // ============================================================================

  mastery: {
    get: (objectId) => invoke('mastery:get', { objectId }),
    getStats: (goalId) => invoke('mastery:getStats', { goalId }),
  },

  // ============================================================================
  // Analytics
  // ============================================================================

  analytics: {
    getProgress: (goalId, timeRange) =>
      invoke('analytics:getProgress', { goalId, timeRange }),
    getBottlenecks: (goalId, minResponses) =>
      invoke('claude:getBottlenecks', { goalId, limit: minResponses }),
    getSessionStats: (goalId, days) =>
      invoke('analytics:getSessionStats', { goalId, days }),
  },

  // ============================================================================
  // User Profile
  // ============================================================================

  profile: {
    get: () => invoke('profile:get', {}),
    update: (data) => invoke('profile:update', data),
    getSettings: () => invoke('profile:getSettings', {}),
    updateSettings: (settings) => invoke('profile:updateSettings', settings),
  },

  // ============================================================================
  // Claude Integration
  // ============================================================================

  claude: {
    generateContent: (type, objectId, context) =>
      invoke('claude:generateContent', { type, objectId, context }),
    analyzeError: (objectId, userResponse, expectedResponse, responseId) =>
      invoke('claude:analyzeError', { objectId, userResponse, expectedResponse, responseId }),
    getHint: (objectId, hintLevel, previousHints) =>
      invoke('claude:getHint', { objectId, hintLevel, previousHints }),
    getBottlenecks: (goalId, limit) =>
      invoke('claude:getBottlenecks', { goalId, limit }),
  },

  // ============================================================================
  // App Info
  // ============================================================================

  app: {
    getVersion: () => invoke('app:getVersion', {}),
    getPlatform: () => process.platform,
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('logos', logosAPI);

// Type declaration for renderer access
declare global {
  interface Window {
    logos: LogosAPI;
  }
}

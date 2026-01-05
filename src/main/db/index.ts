/**
 * Database Module Index
 *
 * Central export point for database access and repositories.
 */

export {
  getPrisma,
  initDatabase,
  closeDatabase,
  withTransaction,
} from './prisma';

export * from './repositories/goal.repository';
export * from './repositories/mastery.repository';
export * from './repositories/session.repository';
export * from './repositories/collocation.repository';

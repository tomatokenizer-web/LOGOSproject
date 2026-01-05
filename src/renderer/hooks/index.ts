/**
 * Hooks Index
 *
 * Central export point for all React hooks.
 */

export {
  // Goal hooks
  useGoals,
  useGoal,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  // Object hooks
  useObjects,
  useCreateObject,
  useImportObjects,
  // Queue hooks
  useQueue,
  useNextItem,
  // Session hooks
  useSession,
  useSessionHistory,
  useStartSession,
  useEndSession,
  useRecordResponse,
  // Analytics hooks
  useProgress,
  useMasteryStats,
  useBottlenecks,
  useSessionStats,
  // Mastery hooks
  useMastery,
  // Claude hooks
  useGenerateContent,
  useAnalyzeError,
  useGetHint,
} from './useLogos';

/**
 * GoalsPage
 *
 * Goal management page for creating and viewing learning goals.
 */

import React, { useState } from 'react';
import { useApp } from '../context';
import { useGoals, useCreateGoal, useDeleteGoal } from '../hooks';
import { GoalCard, CreateGoalForm } from '../components/goal';
import { GlassCard, GlassButton } from '../components/ui';

interface GoalsPageProps {
  onNavigateBack?: () => void;
  onSelectGoal?: (goalId: string) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
  onNavigateBack,
  onSelectGoal,
}) => {
  const { activeGoalId, setActiveGoal, refreshGoals } = useApp();
  const { data: goals, loading: goalsLoading } = useGoals();
  const { execute: createGoal, loading: creating } = useCreateGoal();
  const { execute: deleteGoal } = useDeleteGoal();

  const [showCreateForm, setShowCreateForm] = useState(false);

  // Handle goal creation
  const handleCreateGoal = async (data: {
    name: string;
    targetLanguage: string;
    nativeLanguage: string;
    description?: string;
  }) => {
    try {
      const newGoal = await createGoal(data);
      setShowCreateForm(false);
      refreshGoals();

      // Auto-select the new goal
      if (newGoal?.id) {
        setActiveGoal(newGoal.id);
        onSelectGoal?.(newGoal.id);
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  // Handle goal selection
  const handleSelectGoal = (goalId: string) => {
    setActiveGoal(goalId);
    onSelectGoal?.(goalId);
  };

  // Handle goal deletion
  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal? All progress will be lost.')) {
      return;
    }

    try {
      await deleteGoal({ id: goalId });
      refreshGoals();

      // Clear active goal if deleted
      if (activeGoalId === goalId) {
        setActiveGoal(null);
      }
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  // Loading state
  if (goalsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">🎯</div>
          <p className="text-muted">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Learning Goals</h1>
          <p className="text-muted">Manage your language learning objectives</p>
        </div>
        <div className="flex gap-3">
          {onNavigateBack && (
            <GlassButton variant="ghost" onClick={onNavigateBack}>
              ← Back
            </GlassButton>
          )}
          <GlassButton variant="primary" onClick={() => setShowCreateForm(true)}>
            + New Goal
          </GlassButton>
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full">
            <CreateGoalForm
              onSubmit={handleCreateGoal}
              onCancel={() => setShowCreateForm(false)}
              loading={creating}
            />
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals && goals.length > 0 ? (
        <div className="grid gap-4">
          {goals.map((goal: any) => (
            <GoalCard
              key={goal.id}
              goal={{
                id: goal.id,
                name: goal.name,
                targetLanguage: goal.targetLanguage,
                nativeLanguage: goal.nativeLanguage,
                description: goal.description,
                progress: goal.progress || 0,
                itemCount: goal.itemCount || 0,
                streak: goal.streak || 0,
                isActive: goal.id === activeGoalId,
              }}
              onSelect={() => handleSelectGoal(goal.id)}
              onDelete={() => handleDeleteGoal(goal.id)}
            />
          ))}
        </div>
      ) : (
        <GlassCard className="p-12 text-center">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-xl font-bold mb-2">No Goals Yet</h2>
          <p className="text-muted mb-6 max-w-md mx-auto">
            Create your first learning goal to start your journey.
            Define the language you want to learn and we'll help you get there.
          </p>
          <GlassButton variant="primary" size="lg" onClick={() => setShowCreateForm(true)}>
            Create Your First Goal
          </GlassButton>
        </GlassCard>
      )}

      {/* Tips Section */}
      {goals && goals.length > 0 && (
        <GlassCard className="mt-6 p-4" variant="info">
          <h3 className="font-medium mb-2">💡 Tips</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>• Focus on one goal at a time for better results</li>
            <li>• Review items daily to maintain your streak</li>
            <li>• Add diverse content to cover all language components</li>
          </ul>
        </GlassCard>
      )}
    </div>
  );
};

export default GoalsPage;

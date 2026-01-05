/**
 * CreateGoalForm Component
 *
 * Form for creating new learning goals.
 * Guides users through goal setup with clear, focused steps.
 *
 * Design Philosophy:
 * - Simple, focused form reduces decision fatigue
 * - Language selection is visual and delightful
 * - Preview shows what the goal will look like
 * - Validation is helpful, not punitive
 */

import React, { useState } from 'react';
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassTextarea,
  GlassSelect,
} from '../ui';

// ============================================================================
// Types
// ============================================================================

export type Domain = 'medical' | 'legal' | 'business' | 'academic' | 'general';
export type Modality = 'reading' | 'listening' | 'writing' | 'speaking';

export interface CreateGoalFormData {
  domain: Domain;
  modality: Modality[];
  genre: string;
  purpose: string;
  benchmark?: string;
  deadline?: string;
}

export interface CreateGoalFormProps {
  /** Callback when form is submitted */
  onSubmit: (data: CreateGoalFormData) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Initial values (for editing) */
  initialValues?: Partial<CreateGoalFormData>;
  /** Whether we're editing an existing goal */
  isEditing?: boolean;
  /** Loading state */
  loading?: boolean;
}

// ============================================================================
// Options
// ============================================================================

const domainOptions: { value: Domain; label: string; icon: string }[] = [
  { value: 'general', label: 'General', icon: '📚' },
  { value: 'medical', label: 'Medical', icon: '🏥' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'academic', label: 'Academic', icon: '🎓' },
];

const modalityOptions: { value: Modality; label: string; icon: string }[] = [
  { value: 'reading', label: 'Reading', icon: '📖' },
  { value: 'listening', label: 'Listening', icon: '🎧' },
  { value: 'writing', label: 'Writing', icon: '✍️' },
  { value: 'speaking', label: 'Speaking', icon: '🗣️' },
];

const purposeOptions = [
  { value: 'certification', label: 'Certification Exam' },
  { value: 'professional', label: 'Professional Development' },
  { value: 'academic', label: 'Academic Study' },
  { value: 'personal', label: 'Personal Growth' },
  { value: 'travel', label: 'Travel & Culture' },
];

const benchmarkOptions = [
  { value: '', label: 'None' },
  { value: 'CELBAN', label: 'CELBAN' },
  { value: 'IELTS', label: 'IELTS' },
  { value: 'TOEFL', label: 'TOEFL' },
  { value: 'CELPIP', label: 'CELPIP' },
  { value: 'DELF', label: 'DELF/DALF' },
  { value: 'DELE', label: 'DELE' },
  { value: 'HSK', label: 'HSK' },
  { value: 'JLPT', label: 'JLPT' },
  { value: 'TOPIK', label: 'TOPIK' },
];

// ============================================================================
// CreateGoalForm Component
// ============================================================================

export const CreateGoalForm: React.FC<CreateGoalFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  isEditing = false,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CreateGoalFormData>({
    domain: initialValues?.domain || 'general',
    modality: initialValues?.modality || ['reading', 'listening'],
    genre: initialValues?.genre || 'conversation',
    purpose: initialValues?.purpose || 'personal',
    benchmark: initialValues?.benchmark || '',
    deadline: initialValues?.deadline || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateGoalFormData, string>>>({});
  const [step, setStep] = useState<1 | 2>(1);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.domain) {
      newErrors.domain = 'Please select a domain';
    }

    if (!formData.modality || formData.modality.length === 0) {
      newErrors.modality = 'Please select at least one modality';
    }

    if (!formData.genre.trim()) {
      newErrors.genre = 'Please specify a genre';
    }

    if (!formData.purpose) {
      newErrors.purpose = 'Please select a purpose';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      ...formData,
      genre: formData.genre.trim(),
      benchmark: formData.benchmark || undefined,
      deadline: formData.deadline || undefined,
    });
  };

  const handleChange = (field: keyof CreateGoalFormData, value: string | string[] | Modality[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleModality = (mod: Modality) => {
    const current = formData.modality;
    if (current.includes(mod)) {
      if (current.length > 1) {
        handleChange('modality', current.filter(m => m !== mod));
      }
    } else {
      handleChange('modality', [...current, mod]);
    }
  };

  const getDomainLabel = (domain: Domain) => {
    const opt = domainOptions.find((d) => d.value === domain);
    return opt ? `${opt.icon} ${opt.label}` : domain;
  };

  // Step 1: Domain Selection
  if (step === 1) {
    return (
      <GlassCard className="create-goal-form" padding="lg">
        <h2 className="text-2xl font-semibold mb-2">
          {isEditing ? 'Edit Goal' : 'Create a New Goal'}
        </h2>
        <p className="text-muted mb-6">
          Select your learning domain
        </p>

        <div className="domain-grid">
          {domainOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`domain-option glass-light ${
                formData.domain === opt.value ? 'domain-option--selected' : ''
              }`}
              onClick={() => handleChange('domain', opt.value)}
            >
              <span className="text-3xl">{opt.icon}</span>
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>

        {errors.domain && (
          <p className="text-danger text-sm mt-2">{errors.domain}</p>
        )}

        <h3 className="text-lg font-semibold mt-6 mb-3">Select Modalities</h3>
        <div className="modality-grid">
          {modalityOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`modality-option glass-light ${
                formData.modality.includes(opt.value) ? 'modality-option--selected' : ''
              }`}
              onClick={() => toggleModality(opt.value)}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>

        {errors.modality && (
          <p className="text-danger text-sm mt-2">{errors.modality}</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          {onCancel && (
            <GlassButton variant="ghost" onClick={onCancel}>
              Cancel
            </GlassButton>
          )}
          <GlassButton
            variant="primary"
            onClick={() => {
              if (formData.domain && formData.modality.length > 0) {
                setStep(2);
              } else {
                setErrors({
                  domain: !formData.domain ? 'Please select a domain' : undefined,
                  modality: formData.modality.length === 0 ? 'Please select at least one modality' : undefined,
                });
              }
            }}
          >
            Continue
          </GlassButton>
        </div>

        <style>{`
          .domain-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: var(--space-3);
          }

          .domain-option, .modality-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-4);
            border: 2px solid transparent;
            border-radius: var(--radius-xl);
            cursor: pointer;
            transition: all var(--duration-200) var(--ease-out);
          }

          .domain-option:hover, .modality-option:hover {
            border-color: hsl(var(--color-primary) / 0.3);
            transform: translateY(-2px);
          }

          .domain-option--selected, .modality-option--selected {
            border-color: hsl(var(--color-primary));
            background: hsl(var(--color-primary) / 0.1);
            box-shadow: var(--shadow-inner-glow);
          }

          .modality-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: var(--space-3);
          }
        `}</style>
      </GlassCard>
    );
  }

  // Step 2: Goal Details
  return (
    <GlassCard className="create-goal-form" padding="lg">
      <button
        type="button"
        className="back-button mb-4"
        onClick={() => setStep(1)}
      >
        Back to domain selection
      </button>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">
          {domainOptions.find((d) => d.value === formData.domain)?.icon}
        </span>
        <div>
          <h2 className="text-2xl font-semibold">
            {isEditing ? 'Edit Goal' : 'Set Up Your Goal'}
          </h2>
          <p className="text-muted">
            {getDomainLabel(formData.domain)} - {formData.modality.join(', ')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <GlassInput
          label="Genre"
          placeholder="e.g., conversation, report, presentation"
          value={formData.genre}
          onChange={(e) => handleChange('genre', e.target.value)}
          error={errors.genre}
          helperText="What type of content will you focus on?"
        />

        <div className="grid grid-cols-2 gap-4">
          <GlassSelect
            label="Purpose"
            value={formData.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
            options={purposeOptions}
            error={errors.purpose}
          />

          <GlassSelect
            label="Benchmark (Optional)"
            value={formData.benchmark || ''}
            onChange={(e) => handleChange('benchmark', e.target.value)}
            options={benchmarkOptions}
            helperText="Target certification exam"
          />
        </div>

        <GlassInput
          label="Deadline (Optional)"
          type="date"
          value={formData.deadline || ''}
          onChange={(e) => handleChange('deadline', e.target.value)}
          helperText="When do you want to achieve this goal?"
        />

        {/* Preview */}
        <div className="goal-preview glass-light">
          <h4 className="text-sm font-medium text-muted mb-2">Preview</h4>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {domainOptions.find((d) => d.value === formData.domain)?.icon}
            </span>
            <div>
              <p className="font-semibold">{formData.genre || 'Your Genre'}</p>
              <p className="text-sm text-muted">
                {getDomainLabel(formData.domain)} | {formData.modality.join(', ')} | {purposeOptions.find(p => p.value === formData.purpose)?.label}
                {formData.benchmark && ` | ${formData.benchmark}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          {onCancel && (
            <GlassButton variant="ghost" onClick={onCancel} disabled={loading}>
              Cancel
            </GlassButton>
          )}
          <GlassButton variant="primary" type="submit" loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Goal'}
          </GlassButton>
        </div>
      </form>

      <style>{`
        .back-button {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-1) 0;
          font-size: var(--text-sm);
          color: hsl(var(--color-neutral-500));
          background: none;
          border: none;
          cursor: pointer;
          transition: color var(--duration-150) var(--ease-out);
        }

        .back-button:hover {
          color: hsl(var(--color-primary));
        }

        .goal-preview {
          padding: var(--space-4);
          border-radius: var(--radius-xl);
          margin-top: var(--space-4);
        }

        .space-y-4 > * + * {
          margin-top: var(--space-4);
        }
      `}</style>
    </GlassCard>
  );
};

export default CreateGoalForm;

/**
 * GlassInput Component
 *
 * Form input with Liquid Glass styling.
 * Designed for extended text entry with clear focus states.
 *
 * Design Philosophy:
 * - Inputs are recessed glass surfaces (vs. raised buttons)
 * - Focus states use inner glow rather than harsh outlines
 * - Error states are clear but not alarming (language learning context)
 * - Labels and helper text provide scaffolding
 */

import React, { forwardRef, useId } from 'react';

export interface GlassInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message (also sets error styling) */
  error?: string;
  /** Input size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Icon displayed inside the input (left side) */
  iconLeft?: React.ReactNode;
  /** Icon displayed inside the input (right side) */
  iconRight?: React.ReactNode;
  /** Full width input */
  fullWidth?: boolean;
}

const sizeClasses = {
  sm: 'h-9 text-sm px-3',
  md: 'h-11 text-base px-4',
  lg: 'h-13 text-lg px-5',
};

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  (
    {
      label,
      helperText,
      error,
      size = 'md',
      iconLeft,
      iconRight,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hasError = Boolean(error);

    const inputClasses = [
      'glass-input',
      sizeClasses[size],
      hasError ? 'glass-input-error' : '',
      iconLeft ? 'pl-10' : '',
      iconRight ? 'pr-10' : '',
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`glass-input-wrapper ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="glass-input-label">
            {label}
          </label>
        )}

        <div className="relative">
          {iconLeft && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {iconLeft}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {iconRight}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={`glass-input-helper ${error ? 'text-danger' : 'text-muted'}`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

/**
 * GlassTextarea - Multiline text input
 */
export interface GlassTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  (
    { label, helperText, error, fullWidth = true, className = '', id, ...props },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hasError = Boolean(error);

    const textareaClasses = [
      'glass-input',
      'min-h-[100px] py-3 resize-y',
      hasError ? 'glass-input-error' : '',
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`glass-input-wrapper ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="glass-input-label">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          className={textareaClasses}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />

        {(error || helperText) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={`glass-input-helper ${error ? 'text-danger' : 'text-muted'}`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

GlassTextarea.displayName = 'GlassTextarea';

/**
 * GlassSelect - Dropdown select with glass styling
 */
export interface GlassSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(
  (
    {
      label,
      helperText,
      error,
      size = 'md',
      fullWidth = true,
      options,
      placeholder,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hasError = Boolean(error);

    const selectClasses = [
      'glass-input',
      'appearance-none cursor-pointer pr-10',
      sizeClasses[size],
      hasError ? 'glass-input-error' : '',
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`glass-input-wrapper ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="glass-input-label">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={selectClasses}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown chevron */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className="w-4 h-4 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {(error || helperText) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={`glass-input-helper ${error ? 'text-danger' : 'text-muted'}`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

GlassSelect.displayName = 'GlassSelect';

export default GlassInput;

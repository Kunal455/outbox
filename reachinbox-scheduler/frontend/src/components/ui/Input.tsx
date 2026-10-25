import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={generatedId} className="block text-xs font-semibold text-slate-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={generatedId}
            ref={ref}
            className={cn(
              'w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400',
              'transition duration-150 ease-in-out shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
              'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
              error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-gray-400 pointer-events-none flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 animate-fadeIn">{error}</p>}
        {!error && helperText && <p className="text-xs text-gray-400">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

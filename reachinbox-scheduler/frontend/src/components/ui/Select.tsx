import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, children, id, ...props }, ref) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={generatedId} className="block text-xs font-medium text-gray-300">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={generatedId}
            ref={ref}
            className={cn(
              'w-full appearance-none bg-[#0D121F] border rounded-lg px-3.5 py-2 pr-10 text-sm text-gray-100',
              'transition duration-150 ease-in-out cursor-pointer',
              'focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500',
              'disabled:bg-[#151C2C] disabled:text-gray-500 disabled:cursor-not-allowed',
              error ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500' : 'border-dark-border',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[#121826] text-gray-100">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 text-gray-400 pointer-events-none flex items-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!error && helperText && <p className="text-xs text-gray-400">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

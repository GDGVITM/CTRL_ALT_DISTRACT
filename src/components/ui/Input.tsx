import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  trailing?: ReactNode;
  leading?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, trailing, leading, className, id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-body text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {leading && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              "h-12 w-full rounded-xs border border-border-default bg-bg-inset px-4 font-body text-base text-text-primary placeholder:text-text-muted transition-colors",
              "hover:border-border-strong focus:border-accent-cyan focus:outline-none",
              !!leading && "pl-10",
              !!trailing && "pr-11",
              error && "border-danger",
              className,
            )}
            {...rest}
          />
          {trailing && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 flex items-center gap-1 font-body text-xs text-danger">
            ✕ {error}
          </p>
        )}
      </div>
    );
  },
);
TextInput.displayName = "TextInput";

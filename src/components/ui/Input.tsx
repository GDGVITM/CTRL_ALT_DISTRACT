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
              "h-12 w-full rounded-xs border border-border-default bg-[#0d0e12] px-4 font-body text-base text-white placeholder:text-text-muted transition-colors caret-[#38e1ff]",
              "hover:border-border-strong focus:border-accent-cyan focus:bg-[#12131a] focus:outline-none focus:ring-1 focus:ring-accent-cyan",
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
        <div className="min-h-[20px]">
          {error && (
            <p id={`${inputId}-error`} className="flex items-center gap-1 font-body text-sm text-danger">
              ✕ {error}
            </p>
          )}
        </div>
      </div>
    );
  },
);
TextInput.displayName = "TextInput";

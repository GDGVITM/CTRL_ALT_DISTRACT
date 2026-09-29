import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "bonus";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  chamfer?: boolean;
  fullWidth?: boolean;
  to?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-14 px-8 text-[18px] gap-2.5",
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent-yellow text-black shadow-[0_4px_0_0_#8A6A0E] hover:bg-accent-yellow-hover hover:shadow-[0_0_12px_rgba(255,210,63,0.35),0_4px_0_0_#8A6A0E] active:translate-y-[3px] active:shadow-[0_1px_0_0_#8A6A0E] disabled:bg-[#2A2B31] disabled:text-text-disabled disabled:shadow-none disabled:cursor-not-allowed",
  secondary:
    "bg-transparent border border-border-strong text-text-primary hover:bg-bg-hover hover:border-text-muted active:translate-y-px active:bg-bg-elevated disabled:border-border-default disabled:text-text-disabled disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:text-text-disabled disabled:cursor-not-allowed",
  danger:
    "bg-transparent border border-danger text-danger hover:bg-fill-danger disabled:opacity-40 disabled:cursor-not-allowed",
  bonus:
    "bg-accent-magenta text-black shadow-[0_4px_0_0_#7A1450] hover:brightness-110 active:translate-y-[3px] active:shadow-[0_1px_0_0_#7A1450] disabled:bg-[#2A2B31] disabled:text-text-disabled disabled:shadow-none disabled:cursor-not-allowed",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  trailing,
  loading,
  loadingLabel,
  chamfer,
  fullWidth,
  to,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center font-sans font-bold uppercase tracking-[0.06em] transition-all duration-[120ms] ease-out select-none whitespace-nowrap",
    chamfer ? "chamfer" : "rounded-sm",
    sizeClasses[size],
    variantClasses[variant],
    fullWidth && "w-full",
    className,
  );
  const content = loading ? (
    <>
      <PixelSpinner />
      <span>{loadingLabel ?? "LOADING…"}</span>
    </>
  ) : (
    <>
      {icon}
      <span>{children}</span>
      {trailing && (
        <span className="ml-1 font-mono text-[11px] normal-case tracking-normal text-text-muted">
          {trailing}
        </span>
      )}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={classes} onClick={rest.onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}

export function PixelSpinner({ size = 16 }: { size?: number }) {
  const block = size / 4;
  return (
    <span
      className="inline-grid grid-cols-3 gap-[2px]"
      style={{ width: size, height: block }}
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bg-current animate-pulse-fast"
          style={{
            width: block,
            height: block,
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </span>
  );
}

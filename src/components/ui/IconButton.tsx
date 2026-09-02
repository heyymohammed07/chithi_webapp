import React from "react";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "ghost" | "secondary" | "danger" | "wax";
  size?: "sm" | "md" | "lg";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      label,
      variant = "ghost",
      size = "md",
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center transition-colors duration-150 rounded-btn min-w-[44px] min-h-[44px] select-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2";

    const variantStyles = {
      ghost:
        "bg-transparent hover:bg-ink-raised text-ash hover:text-ivory border border-transparent",
      secondary:
        "bg-ink-raised hover:bg-ink-hairline text-ivory border border-ink-hairline hover:border-gold-dim",
      danger:
        "bg-transparent hover:bg-wax/20 text-ash hover:text-wax border border-transparent",
      wax:
        "bg-wax hover:bg-wax-dim text-ivory border border-transparent",
    };

    const sizeStyles = {
      sm: "w-9 h-9 min-w-[36px] min-h-[36px] p-1.5",
      md: "w-11 h-11 min-w-[44px] min-h-[44px] p-2",
      lg: "w-12 h-12 min-w-[48px] min-h-[48px] p-2.5",
    };

    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

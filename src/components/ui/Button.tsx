import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-full select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E88B60] focus-visible:outline-offset-2";

    const variantStyles = {
      primary:
        "bg-[#FFE5B4] hover:bg-[#FCD34D] text-[#382A22] active:bg-[#FCD34D] border border-[#FCD34D] shadow-sm font-semibold",
      secondary:
        "bg-[#FFF8F0] dark:bg-[#1E0F2E] hover:bg-[#FFE5B4]/50 dark:hover:bg-[#2B143D] text-[#382A22] dark:text-[#FFF8F0] border border-[#F0E2D2] dark:border-[#351D4D] hover:border-[#E88B60] shadow-sm",
      outline:
        "bg-transparent hover:bg-[#FFF8F0] dark:hover:bg-[#1E0F2E] text-[#382A22] dark:text-[#FFF8F0] border border-[#F0E2D2] dark:border-[#351D4D] hover:border-[#E88B60]",
      ghost:
        "bg-transparent hover:bg-[#FFF8F0] dark:hover:bg-[#1E0F2E] text-[#857367] dark:text-[#C5B3A6] hover:text-[#382A22] dark:hover:text-[#FFF8F0] border border-transparent",
      danger:
        "bg-[#E88B60] hover:bg-[#D67448] text-white active:bg-[#D67448] border border-transparent",
    };

    const sizeStyles = {
      sm: "text-xs py-1.5 px-3.5 min-h-[36px]",
      md: "text-sm py-2 px-5 min-h-[44px]",
      lg: "text-base py-3 px-6 min-h-[48px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full min-h-[44px] px-4 py-2.5 text-sm bg-surface-raised text-ink placeholder:text-ink-faint rounded-xl border transition-colors duration-150 focus:outline-none focus:border-wax focus:ring-1 focus:ring-wax shadow-sm ${
          error
            ? "border-danger text-danger focus:border-danger focus:ring-danger"
            : "border-edge hover:border-wax"
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

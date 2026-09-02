import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full min-h-[44px] px-4 py-2.5 text-sm bg-white dark:bg-[#251338] text-[#2C1E16] dark:text-[#FFF8F0] placeholder:text-[#A8988B] dark:placeholder:text-[#8E7B9D] rounded-xl border transition-colors duration-150 focus:outline-none focus:border-[#E88B60] focus:ring-1 focus:ring-[#E88B60] shadow-sm ${
          error
            ? "border-[#D9534F] text-[#D9534F] focus:border-[#D9534F] focus:ring-[#D9534F]"
            : "border-[#F0E2D2] dark:border-[#4A286D] hover:border-[#D4A373] dark:hover:border-[#E88B60]"
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

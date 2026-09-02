import React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, className = "", error = false, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={`w-full min-h-[44px] px-4 py-2.5 pr-9 text-sm bg-[#FFFDF9] text-[#2D2522] rounded-xl border appearance-none transition-colors duration-150 focus:outline-none focus:border-[#D9534F] focus:ring-1 focus:ring-[#D9534F] shadow-sm ${
            error
              ? "border-[#D9534F] text-[#D9534F] focus:border-[#D9534F]"
              : "border-[#EBE3D5] hover:border-[#D4A373]"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#7C7069]">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";

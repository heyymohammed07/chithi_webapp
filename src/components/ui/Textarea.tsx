import React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full min-h-[140px] px-4 py-3 text-base bg-ink text-ivory placeholder:text-ash-dim rounded-input border transition-colors duration-150 whitespace-pre-wrap focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold ${
          error
            ? "border-wax text-wax focus:border-wax focus:ring-wax"
            : "border-ink-hairline hover:border-gold-dim"
        } ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

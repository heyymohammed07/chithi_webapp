import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "gold" | "wax" | "warn" | "success" | "lavender" | "sage" | "buttercup" | "skymist";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className = "",
}: BadgeProps) {
  const variantStyles = {
    default: "bg-surface text-ink-muted border-edge",
    gold: "bg-peach text-peach-text border-peach-hover",
    wax: "bg-wax/10 text-wax border-wax/30",
    warn: "bg-warn-surface text-warn-text border-warn-edge",
    success: "bg-success-surface text-success-text border-success-edge",
    lavender: "bg-lavender text-lavender-text border-edge",
    sage: "bg-success-surface text-success-text border-success-edge",
    buttercup: "bg-warn-surface text-warn-text border-warn-edge",
    skymist: "bg-skymist text-skymist-text border-edge",
  };

  const sizeStyles = {
    sm: "text-[11px] py-0.5 px-2.5",
    md: "text-xs py-1 px-3",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}

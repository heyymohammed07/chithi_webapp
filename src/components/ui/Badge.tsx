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
    default: "bg-[#FFFDF9] text-[#7C7069] border-[#EBE3D5]",
    gold: "bg-[#FEF3C7] text-[#6D4E12] border-[#FDE68A]",
    wax: "bg-[#D9534F]/10 text-[#D9534F] border-[#D9534F]/30",
    warn: "bg-[#FEF3C7] text-[#6D4E12] border-[#FDE68A]",
    success: "bg-[#D8ECD9] text-[#2E5334] border-[#A7F3D0]",
    lavender: "bg-[#E8DEF8] text-[#493F60] border-[#D8B4F8]",
    sage: "bg-[#D8ECD9] text-[#2E5334] border-[#A7F3D0]",
    buttercup: "bg-[#FEF3C7] text-[#6D4E12] border-[#FDE68A]",
    skymist: "bg-[#E0F2FE] text-[#1E4868] border-[#BAE6FD]",
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

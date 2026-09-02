import React from "react";

export interface WaxSealProps {
  isCracked?: boolean;
  size?: number;
  className?: string;
}

export function WaxSeal({
  isCracked = false,
  size = 48,
  className = "",
}: WaxSealProps) {
  if (!isCracked) {
    return (
      <div
        className={`rounded-full bg-wax border border-wax-dim shadow-lg flex items-center justify-center text-ivory select-none ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="font-serif italic font-bold text-xl drop-shadow-sm">
          C
        </span>
      </div>
    );
  }

  // Two halves cracking apart (§11.4)
  return (
    <div
      className={`relative select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Left half */}
      <div
        className="absolute inset-0 rounded-full bg-wax border border-wax-dim shadow-md flex items-center justify-center text-ivory overflow-hidden transition-transform duration-700 ease-out"
        style={{
          clipPath: "polygon(0 0, 52% 0, 48% 100%, 0 100%)",
          transform: "rotate(-8deg) translateX(-6px)",
          opacity: 0.8,
        }}
      >
        <span className="font-serif italic font-bold text-xl">C</span>
      </div>

      {/* Right half */}
      <div
        className="absolute inset-0 rounded-full bg-wax border border-wax-dim shadow-md flex items-center justify-center text-ivory overflow-hidden transition-transform duration-700 ease-out"
        style={{
          clipPath: "polygon(52% 0, 100% 0, 100% 100%, 48% 100%)",
          transform: "rotate(8deg) translateX(6px)",
          opacity: 0.8,
        }}
      >
        <span className="font-serif italic font-bold text-xl">C</span>
      </div>
    </div>
  );
}

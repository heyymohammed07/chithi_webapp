import React from "react";

export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[1] select-none"
      style={{
        opacity: 0.035,
        mixBlendMode: "soft-light",
        backgroundImage: "url(/textures/grain.svg)",
        backgroundRepeat: "repeat",
      }}
    />
  );
}

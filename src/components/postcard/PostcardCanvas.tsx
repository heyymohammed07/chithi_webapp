"use client";

import React, { useEffect, useRef, useState } from "react";
import { LetterRecord, OpenLetter, FontId } from "@/lib/types";
import { PaperSurface } from "../letter/PaperSurface";
import { PAPERS } from "@/lib/paper";

export interface PostcardCanvasProps {
  letter: LetterRecord | OpenLetter | null;
  font?: FontId;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function PostcardCanvas({ letter, font, canvasRef }: PostcardCanvasProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(28);

  // Auto-scaling font size to fit 540x960 postcard canvas without clipping (§14.4)
  useEffect(() => {
    if (!letter || !textRef.current) return;

    let currentSize = 28;
    const minSize = 18;
    const maxHeight = 620; // Available vertical text area

    while (
      textRef.current.scrollHeight > maxHeight &&
      currentSize > minSize
    ) {
      currentSize -= 1;
      textRef.current.style.fontSize = `${currentSize}px`;
    }

    setFontSize(currentSize);
  }, [letter]);

  if (!letter) return null;

  const paperDef = PAPERS[letter.paper] || PAPERS.parchment;

  return (
    // Rendered off-screen at exactly 540x960px. Never display: none (§14)
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: "-10000px",
        top: 0,
        width: "540px",
        height: "960px",
        zIndex: -100,
        pointerEvents: "none",
      }}
    >
      <div
        ref={canvasRef}
        style={{
          width: "540px",
          height: "960px",
          backgroundColor: paperDef.baseColor,
        }}
        className="relative overflow-hidden"
      >
        <PaperSurface
          paper={letter.paper}
          stamp={letter.stamp}
          font={font}
          stampSeed={letter.id}
          variant="postcard"
          watermark={true}
          className="w-full h-full p-12 flex flex-col justify-between"
        >
          {/* Main letter body with dynamic font-size fitting */}
          <div
            ref={textRef}
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
            className="whitespace-pre-wrap break-words max-h-[640px] overflow-hidden my-auto"
          >
            {letter.body}
          </div>
        </PaperSurface>
      </div>
    </div>
  );
}

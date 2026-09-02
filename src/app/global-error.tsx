"use client";

import React from "react";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#0F0E11",
          color: "#F0EDE6",
          fontFamily: "serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            padding: "32px",
            border: "1px solid #26242B",
            borderRadius: "10px",
            backgroundColor: "#1A191E",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "4px",
              background: "#B83B3B",
              margin: "0 auto 20px auto",
              borderRadius: "2px",
            }}
          />
          <h2 style={{ fontSize: "24px", margin: "0 0 12px 0" }}>
            The ink smudged.
          </h2>
          <p
            style={{
              color: "#8E8B94",
              fontSize: "14px",
              lineHeight: "1.6",
              marginBottom: "24px",
            }}
          >
            A critical fault occurred in the postal ledger. You may try refreshing
            the connection.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#1A191E",
              color: "#D4A373",
              border: "1px solid #D4A373",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}

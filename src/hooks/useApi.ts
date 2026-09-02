"use client";

import { useState, useCallback } from "react";
import { ApiResponse, ApiErr } from "@/lib/types";

interface UseApiOptions {
  token?: string | null;
}

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiErr["error"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const request = useCallback(
    async (
      url: string,
      options: RequestInit & UseApiOptions = {}
    ): Promise<{ ok: boolean; data?: T; error?: ApiErr["error"] }> => {
      setIsLoading(true);
      setError(null);

      const headers = new Headers(options.headers);
      if (!headers.has("Content-Type") && options.body) {
        headers.set("Content-Type", "application/json");
      }

      if (options.token) {
        headers.set("Authorization", `Bearer ${options.token}`);
      }

      try {
        const res = await fetch(url, {
          ...options,
          headers,
        });

        const json: ApiResponse<T> = await res.json();

        if (json.ok) {
          setData(json.data);
          setIsLoading(false);
          return { ok: true, data: json.data };
        } else {
          setError(json.error);
          setIsLoading(false);
          return { ok: false, error: json.error };
        }
      } catch {
        const fallbackError: ApiErr["error"] = {
          code: "INTERNAL",
          message: "errors.generic",
        };
        setError(fallbackError);
        setIsLoading(false);
        return { ok: false, error: fallbackError };
      }
    },
    []
  );

  return {
    data,
    error,
    isLoading,
    request,
    setData,
    setError,
  };
}

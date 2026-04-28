import { useEffect, useRef, useState } from "react";

interface UsePollingOptions {
  /** Polling interval in milliseconds. Default: 5000 (5 seconds) */
  interval?: number;
  /** Whether to start polling immediately. Default: true */
  enabled?: boolean;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called on successful fetch */
  onSuccess?: (data: any) => void;
}

/**
 * Hook for polling a fetch URL at regular intervals
 * Useful for real-time data synchronization
 */
export function usePolling<T>(
  url: string | null,
  options: UsePollingOptions = {}
) {
  const { interval = 5000, enabled = true, onError, onSuccess } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Fetch function
  const fetchData = async () => {
    if (!url || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch data`);
      }

      const result = (await response.json()) as T;

      if (isMountedRef.current) {
        setData(result);
        setError(null);
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Setup polling
  useEffect(() => {
    if (!url || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Fetch immediately on mount or URL change
    void fetchData();

    // Setup interval for polling
    intervalRef.current = setInterval(() => {
      void fetchData();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [url, enabled, interval, onError, onSuccess]);

  // Manual refetch function
  const refetch = async () => {
    await fetchData();
  };

  return { data, isLoading, error, refetch };
}

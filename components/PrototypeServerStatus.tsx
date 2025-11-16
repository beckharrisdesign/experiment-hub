"use client";

import { useState, useEffect, useRef } from "react";

interface PrototypeServerStatusProps {
  port: number | undefined;
  hasPrototype: boolean;
}

export default function PrototypeServerStatus({
  port,
  hasPrototype,
}: PrototypeServerStatusProps) {
  const [isRunning, setIsRunning] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const aggressivePollRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    if (!port || !hasPrototype) return;
    
    try {
      const response = await fetch(`/api/prototypes/${port}/status`);
      if (response.ok) {
        const data = await response.json();
        setIsRunning(data.running);
      }
    } catch (error) {
      console.error("Error checking port status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const startPolling = (intervalMs: number = 3000) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Start new polling
    pollIntervalRef.current = setInterval(checkStatus, intervalMs);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (aggressivePollRef.current) {
      clearInterval(aggressivePollRef.current);
      aggressivePollRef.current = null;
    }
  };

  // Check status on mount and periodically
  useEffect(() => {
    if (!port || !hasPrototype) {
      setIsRunning(null);
      setIsChecking(false);
      stopPolling();
      return;
    }

    // Initial check
    checkStatus();
    // Start normal polling
    startPolling(3000);

    return () => {
      stopPolling();
    };
  }, [port, hasPrototype]);

  const handleStart = async () => {
    if (!port) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/prototypes/${port}/start`, {
        method: "POST",
      });

      if (response.ok) {
        // Stop normal polling temporarily
        stopPolling();
        
        // Start aggressive polling (every 500ms) to catch when server starts
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds total
        
        aggressivePollRef.current = setInterval(async () => {
          attempts++;
          
          // Check status and get the actual running state
          try {
            const statusResponse = await fetch(`/api/prototypes/${port}/status`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              setIsRunning(statusData.running);
              
              // If server is running or we've tried enough times, switch to normal polling
              if (statusData.running || attempts >= maxAttempts) {
                if (aggressivePollRef.current) {
                  clearInterval(aggressivePollRef.current);
                  aggressivePollRef.current = null;
                }
                setIsLoading(false);
                startPolling(3000);
              }
            }
          } catch (error) {
            console.error("Error checking status during aggressive poll:", error);
            // Continue trying
          }
        }, 500);
      } else {
        const error = await response.json();
        console.error("Failed to start server:", error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error starting server:", error);
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    if (!port) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/prototypes/${port}/stop`, {
        method: "POST",
      });

      if (response.ok) {
        // Check immediately, then continue normal polling
        await checkStatus();
        setIsLoading(false);
        
        // Ensure normal polling continues
        stopPolling();
        startPolling(3000);
      } else {
        const error = await response.json();
        console.error("Failed to stop server:", error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error stopping server:", error);
      setIsLoading(false);
    }
  };

  if (!port || !hasPrototype) {
    return <span className="text-text-muted">—</span>;
  }

  if (isChecking) {
    return (
      <span className="text-sm text-text-muted">Checking...</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 text-xs ${
          isRunning ? "text-green-500" : "text-text-muted"
        }`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isRunning ? "bg-green-500" : "bg-gray-400"
          }`}
        />
        {isRunning ? "Running" : "Stopped"}
      </span>
      {isRunning ? (
        <button
          onClick={handleStop}
          disabled={isLoading}
          className="px-2 py-1 text-xs rounded border border-red-500/50 text-red-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Stop server"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleStart}
          disabled={isLoading}
          className="px-2 py-1 text-xs rounded border border-green-500/50 text-green-500 hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Start server"
        >
          Start
        </button>
      )}
    </div>
  );
}


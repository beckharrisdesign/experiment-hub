"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Button from "@/components/Button";

interface PrototypeStatusProps {
  port: number | undefined;
  hasPrototype: boolean;
  prototypeUrl: string | null;
  experimentSlug: string;
  showActions?: boolean;
}

export default function PrototypeStatus({
  port,
  hasPrototype,
  prototypeUrl,
  experimentSlug,
  showActions = false,
}: PrototypeStatusProps) {
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

  const handleStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleStop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  // If showing actions, return the action buttons
  if (showActions) {
    if (!hasPrototype || !port) {
      return null;
    }

    if (isChecking) {
      return (
        <span className="text-sm text-text-muted">Checking...</span>
      );
    }

    return (
      <div className="flex items-center gap-1.5 justify-center">
        {isRunning ? (
          <Button
            variant="destructive"
            onClick={handleStop}
            disabled={isLoading}
            title="Stop server"
          >
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleStart}
            disabled={isLoading}
            title="Start server"
          >
            Start
          </Button>
        )}
      </div>
    );
  }

  // Otherwise show status in prototype column
  if (!hasPrototype) {
    return null;
  }

  // If prototype exists but no port, just show the link
  if (!port) {
    if (prototypeUrl) {
      if (prototypeUrl.startsWith('http://')) {
        return (
          <a
            href={prototypeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
            title={`Open prototype at ${prototypeUrl}`}
          >
            ✓
          </a>
        );
      }
      return (
        <Link
          href={prototypeUrl}
          className="text-accent-primary hover:underline"
          title="Prototype exists"
        >
          ✓
        </Link>
      );
    }
    return (
      <span className="text-accent-primary" title="Prototype exists">
        ✓
      </span>
    );
  }

  // If we have a port, show buttons
  if (isChecking) {
    return (
      <span className="text-sm text-text-muted" title="Checking server status...">
        ...
      </span>
    );
  }

  // Show buttons: "View" and "Stop" when running, "Start" when stopped
  if (isRunning) {
    // When running, show both "View" and "Stop" buttons
    return (
      <div className="flex items-center gap-1.5">
        {prototypeUrl && prototypeUrl.startsWith('http://') ? (
          <Button
            as="a"
            variant="primary"
            href={prototypeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`View prototype at ${prototypeUrl}`}
          >
            View
          </Button>
        ) : (
          <span className="px-2 py-1 text-xs text-text-muted">View</span>
        )}
        <Button
          variant="destructive"
          onClick={handleStop}
          disabled={isLoading}
          title="Stop server"
        >
          Stop
        </Button>
      </div>
    );
  } else {
    return (
      <Button
        variant="primary"
        onClick={handleStart}
        disabled={isLoading}
        title="Start server"
      >
        Start
      </Button>
    );
  }
}


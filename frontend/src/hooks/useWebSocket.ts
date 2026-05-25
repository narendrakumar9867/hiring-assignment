"use client";

import { useEffect, useRef, useCallback } from "react";
import { JobUpdate } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL!;

export function useWebSocket(
  jobId: string | null,
  onUpdate: (update: JobUpdate) => void
) {
  const wsRef     = useRef<WebSocket | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const connect = useCallback(() => {
    if (!jobId) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", jobId }));
    };

    ws.onmessage = (event) => {
      try {
        const data: JobUpdate = JSON.parse(event.data);
        onUpdateRef.current(data);
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.onerror = (err) => console.error("WS error:", err);

    ws.onclose = () => {
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) connect();
      }, 3000);
    };
  }, [jobId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);
}
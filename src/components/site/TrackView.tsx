"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics-client";

export function TrackView({ event, params }: { event: AnalyticsEvent; params: Record<string, string> }) {
  const key = JSON.stringify(params);
  useEffect(() => {
    // Analytics loads asynchronously after consent; retry briefly.
    const id = setTimeout(() => track(event, JSON.parse(key) as Record<string, string>), 1500);
    return () => clearTimeout(id);
  }, [event, key]);
  return null;
}

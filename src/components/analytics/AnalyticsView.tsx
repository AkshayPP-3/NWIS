"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Ruler,
  TrendingUp,
  Activity,
} from "lucide-react";
import type { FieldAnalytics, Well, WellEvent } from "@/types/well";

interface AnalyticsViewProps {
  wells: Well[];
  events: WellEvent[];
}

export default function AnalyticsView({ wells, events }: AnalyticsViewProps) {
  const [analytics, setAnalytics] = useState<FieldAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch field analytics:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !analytics) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-24 rounded-xl bg-zinc-900 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-56 rounded-xl bg-zinc-900 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const { statusCounts, formationStats, eventSeverityCounts, depthDistribution } =
    analytics;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 text-zinc-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-zinc-100">
              Field Engineering Analytics & KPIs
            </h2>
            <p className="text-xs text-zinc-400">
              Macro operational distributions, depth statistics, and incident frequencies across {analytics.totalWells} monitored wells
            </p>
          </div>
        </div>

        <div className="font-mono text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
          Last Synced: <span className="text-emerald-400 font-bold">Realtime</span>
        </div>
      </div>

      {/* Top 4 KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Operational Status</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-zinc-100">
              {statusCounts.completed + statusCounts.drilling}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">Active Assets</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {statusCounts.drilling} live drilling &bull; {statusCounts.abandoned} abandoned
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Average Total Depth</span>
            <Ruler className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-cyan-400">
              {depthDistribution.avg.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400">meters MD</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Min: {depthDistribution.min}m &bull; Max: {depthDistribution.max}m
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Incident Frequency</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-rose-400">
              {eventSeverityCounts.high}
            </span>
            <span className="text-xs text-rose-400/80 font-semibold">High Severity</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {eventSeverityCounts.medium} Medium &bull; {eventSeverityCounts.low} Low
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Formations Count</span>
            <Layers className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-amber-400">
              {formationStats.length}
            </span>
            <span className="text-xs text-zinc-400">Geological Units</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Assam-Arakan Foreland Basin
          </p>
        </div>
      </div>

      {/* Grid: Status Distribution, Formation Distribution, Incident Frequency */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Status Breakdown */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-amber-400" /> Well Status Distribution
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed Wells
                </span>
                <span className="font-mono">{statusCounts.completed} ({Math.round((statusCounts.completed / analytics.totalWells) * 100)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${(statusCounts.completed / analytics.totalWells) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-amber-400 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 animate-pulse" /> Active Drilling
                </span>
                <span className="font-mono">{statusCounts.drilling} ({Math.round((statusCounts.drilling / analytics.totalWells) * 100)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${(statusCounts.drilling / analytics.totalWells) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Abandoned
                </span>
                <span className="font-mono">{statusCounts.abandoned} ({Math.round((statusCounts.abandoned / analytics.totalWells) * 100)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500"
                  style={{
                    width: `${(statusCounts.abandoned / analytics.totalWells) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Formation Distribution */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-cyan-400" /> Formation Representation
          </h3>

          <div className="space-y-3.5 text-xs">
            {formationStats.map((fmt) => {
              const pct = Math.round((fmt.count / analytics.totalWells) * 100);
              return (
                <div key={fmt.formation}>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-zinc-200">{fmt.formation}</span>
                    <span className="font-mono text-cyan-400">{fmt.count} wells ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Avg Depth: {fmt.avgDepth} m &bull; {fmt.eventCount} historical events
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incident Severity Distribution */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-rose-400" /> Incident Severity Breakdown
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-rose-400">High Severity</span>
                <span className="font-mono">{eventSeverityCounts.high} incidents</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500"
                  style={{
                    width: `${(eventSeverityCounts.high / Math.max(1, events.length)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-amber-400">Medium Severity</span>
                <span className="font-mono">{eventSeverityCounts.medium} incidents</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${(eventSeverityCounts.medium / Math.max(1, events.length)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-blue-400">Low Severity</span>
                <span className="font-mono">{eventSeverityCounts.low} incidents</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${(eventSeverityCounts.low / Math.max(1, events.length)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


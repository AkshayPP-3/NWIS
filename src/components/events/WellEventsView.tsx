"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Flame,
  ShieldAlert,
  Sliders,
  Calendar,
  Layers,
  CheckCircle2,
  Filter,
  ArrowDown,
} from "lucide-react";
import type { Well, WellEvent } from "@/types/well";

interface WellEventsViewProps {
  wells: Well[];
  selectedWell: Well | null;
  onSelectWell: (well: Well) => void;
}

export default function WellEventsView({
  wells,
  selectedWell,
  onSelectWell,
}: WellEventsViewProps) {
  const [activeWellFilter, setActiveWellFilter] = useState<string>(
    selectedWell?.wellId || "ALL"
  );
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");
  const [events, setEvents] = useState<(WellEvent & { well?: Well })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync if selectedWell changes
  useEffect(() => {
    if (selectedWell) {
      setActiveWellFilter(selectedWell.wellId);
    }
  }, [selectedWell]);

  // Fetch events for all wells
  useEffect(() => {
    setLoading(true);
    fetch("/api/wells/events")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const aggregated = (data || []) as (WellEvent & { well?: Well })[];
        aggregated.sort((a, b) => (a.startDepth || 0) - (b.startDepth || 0));
        setEvents(aggregated);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch well events:", err);
        setLoading(false);
      });
  }, [wells]);

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (activeWellFilter !== "ALL" && e.well?.wellId !== activeWellFilter) {
      return false;
    }
    if (
      severityFilter !== "ALL" &&
      (e.severity || "").toLowerCase() !== severityFilter.toLowerCase()
    ) {
      return false;
    }
    if (
      eventTypeFilter !== "ALL" &&
      (e.eventType || "").toLowerCase() !== eventTypeFilter.toLowerCase()
    ) {
      return false;
    }
    return true;
  });

  const eventTypes = Array.from(new Set(events.map((e) => e.eventType)));
  const highSeverityCount = events.filter((e) => e.severity === "High").length;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 text-zinc-100">
      {/* Header & Incident Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-zinc-100">
              Well Events & Historical Incident Intelligence
            </h2>
            <p className="text-xs text-zinc-400">
              Depth-correlated operational incidents, kick occurrences, lost circulation, and mitigation logs
            </p>
          </div>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 font-semibold text-rose-400">
            {highSeverityCount} High Severity Incidents
          </div>
          <div className="rounded-lg border border-zinc-750 bg-zinc-900 px-3 py-1.5 font-mono text-zinc-300">
            {events.length} Total Events Logged
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-850 bg-zinc-900/60 p-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Well Filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="events-well-filter"
              className="text-zinc-400 font-medium"
            >
              Well:
            </label>
            <select
              id="events-well-filter"
              value={activeWellFilter}
              onChange={(e) => setActiveWellFilter(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Wells ({wells.length})</option>
              {wells.map((w) => (
                <option key={w.id} value={w.wellId}>
                  {w.wellId} ({w.name})
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium">Severity:</span>
            {(["ALL", "High", "Medium", "Low"] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`rounded px-2 py-0.5 font-medium transition-all ${
                  severityFilter === sev
                    ? sev === "High"
                      ? "bg-rose-500 text-white font-bold"
                      : "bg-zinc-100 text-zinc-950 font-bold"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                }`}
              >
                {sev === "ALL" ? "All Severities" : sev}
              </button>
            ))}
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="events-type-filter"
              className="text-zinc-400 font-medium"
            >
              Incident Type:
            </label>
            <select
              id="events-type-filter"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="font-mono text-zinc-400 text-xs">
          Showing <strong>{filteredEvents.length}</strong> of {events.length} events
        </span>
      </div>

      {/* Main Layout: Wellbore Column Visualization + Incident List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 1/3: Visual Depth Wellbore Column */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <ArrowDown className="h-3.5 w-3.5 text-amber-400" /> Depth Wellbore Column (MD)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">0m – 4200m</span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-4">
              Geological depth mapping of recorded kicks, stuck pipes, and mud loss zones.
            </p>

            {/* Depth Timeline Column */}
            <div className="relative h-120 w-full border-l-2 border-r-2 border-zinc-800 bg-zinc-900/30 rounded px-2">
              {/* Depth Interval Indicators */}
              {[500, 1000, 1500, 2000, 2500, 3000, 3500, 4000].map((depth) => {
                const topPct = (depth / 4200) * 100;
                return (
                  <div
                    key={depth}
                    className="absolute left-0 right-0 border-t border-dashed border-zinc-800"
                    style={{ top: `${topPct}%` }}
                  >
                    <span className="absolute -left-1 text-[9px] font-mono text-zinc-600">
                      {depth}m
                    </span>
                  </div>
                );
              })}

              {/* Event Depth Blocks */}
              {filteredEvents.map((e) => {
                const top = ((e.startDepth || 1800) / 4200) * 100;
                const height = Math.max(
                  4,
                  (((e.endDepth || e.startDepth || 1800) -
                    (e.startDepth || 1800) +
                    40) /
                    4200) *
                    100
                );

                const isHigh = e.severity === "High";

                return (
                  <div
                    key={e.id}
                    className={`absolute left-2 right-2 rounded p-1 text-[10px] font-bold transition-transform hover:scale-105 cursor-pointer shadow-md ${
                      isHigh
                        ? "bg-rose-900/80 text-rose-200 border border-rose-500/50"
                        : "bg-amber-900/80 text-amber-200 border border-amber-500/50"
                    }`}
                    style={{ top: `${top}%`, minHeight: `${height}%` }}
                    title={`${e.eventType} in ${e.well?.wellId} at ${e.startDepth}m`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{e.eventType}</span>
                      <span className="font-mono text-[9px]">{e.startDepth}m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500">
            Notice: Cluster of High Severity events between 1,900m and 2,400m corresponds to the Barail / Disang transition boundary.
          </div>
        </div>

        {/* Right 2/3: Event Cards Feed */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-28 rounded-xl bg-zinc-900 animate-pulse border border-zinc-800"></div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-12 text-center text-zinc-400">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500/60 mb-3" />
              <h3 className="text-base font-bold text-zinc-200">No Incidents Found</h3>
              <p className="text-xs text-zinc-500 mt-1">
                No well events match the currently selected well or severity filters.
              </p>
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const isHigh = evt.severity === "High";
              return (
                <div
                  key={evt.id}
                  className={`rounded-xl border p-4 shadow-md transition-all ${
                    isHigh
                      ? "border-rose-800/50 bg-rose-950/10 hover:border-rose-600"
                      : "border-zinc-800 bg-zinc-950/80 hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                          isHigh
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-zinc-100">
                            {evt.eventType}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                              isHigh
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            }`}
                          >
                            {evt.severity} Severity
                          </span>
                        </div>
                        {evt.well && (
                          <p className="text-xs font-mono text-zinc-400 mt-0.5">
                            Source Well:{" "}
                            <strong className="text-amber-400">
                              {evt.well.wellId}
                            </strong>{" "}
                            ({evt.well.formation || "N/A"})
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                        {evt.startDepth} m – {evt.endDepth} m
                      </span>
                    </div>
                  </div>

                  {/* Incident Description */}
                  <p className="mt-3 text-xs text-zinc-300 leading-relaxed">
                    {evt.description}
                  </p>

                  {/* Mitigation Applied */}
                  {evt.mitigation && (
                    <div className="mt-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-2.5 text-xs">
                      <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider block mb-0.5">
                        Operational Mitigation Executed:
                      </span>
                      <p className="text-emerald-200/90 italic">
                        {evt.mitigation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


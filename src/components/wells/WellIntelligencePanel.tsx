"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Compass,
  Layers,
  Flame,
  CheckCircle2,
  XCircle,
  Activity,
  AlertTriangle,
  GitCompare,
  Navigation,
  Bot,
  Calendar,
  User,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import type { Well, WellWithDetails, NearbyWellInfo } from "@/types/well";
import { formatDistance } from "@/lib/geo";

interface WellIntelligencePanelProps {
  well: Well;
  onClose: () => void;
  onViewNearby: (well: Well) => void;
  onViewDrilling: (well: Well) => void;
  onViewEvents: (well: Well) => void;
  onAskAI: (query: string) => void;
  onToggleCompare: (wellId: string) => void;
  isCompared: boolean;
}

export default function WellIntelligencePanel({
  well,
  onClose,
  onViewNearby,
  onViewDrilling,
  onViewEvents,
  onAskAI,
  onToggleCompare,
  isCompared,
}: WellIntelligencePanelProps) {
  const [details, setDetails] = useState<WellWithDetails | null>(null);
  const [nearby, setNearby] = useState<NearbyWellInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Fetch full details and nearby wells in parallel
    Promise.all([
      fetch(`/api/wells/${well.wellId}`).then((r) => r.json()),
      fetch(`/api/wells/nearby?wellId=${well.wellId}&radius=15`).then((r) =>
        r.json()
      ),
    ])
      .then(([detailData, nearbyData]) => {
        if (!isMounted) return;
        setDetails(detailData);
        if (nearbyData && nearbyData.wells) {
          setNearby(nearbyData.wells.slice(0, 3));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load well intelligence:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [well.wellId]);

  const status = (well.status || "").toLowerCase();

  return (
    <aside
      aria-label="Well Intelligence Dossier"
      className="flex h-full flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-md text-zinc-200"
    >
      {/* Header: Well ID, Status & Close Button */}
      <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-extrabold text-amber-400">
              {well.wellId}
            </span>
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                status === "drilling"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : status === "abandoned"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}
            >
              {status === "drilling" ? (
                <Flame className="h-3 w-3 animate-pulse" />
              ) : status === "abandoned" ? (
                <XCircle className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {well.status || "Unknown"}
            </span>
          </div>
          <h2 className="mt-1 text-sm font-semibold text-zinc-100">{well.name}</h2>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          title="Close Panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
        <button
          onClick={() => onToggleCompare(well.wellId)}
          className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 px-2 transition-all ${
            isCompared
              ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          <GitCompare className="h-3.5 w-3.5" />
          <span>{isCompared ? "In Comparison" : "+ Compare"}</span>
        </button>

        <button
          onClick={() => onViewNearby(well)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 px-2 text-amber-400 hover:bg-amber-500/20 transition-all"
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>Nearby Offsets</span>
        </button>

        <button
          onClick={() => onViewDrilling(well)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 py-2 px-2 text-cyan-400 hover:bg-cyan-500/20 transition-all"
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Drilling Curves</span>
        </button>

        <button
          onClick={() => onAskAI(`Summarize the drilling history and risks of ${well.wellId}`)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 py-2 px-2 text-violet-300 hover:bg-violet-500/20 transition-all"
        >
          <Bot className="h-3.5 w-3.5" />
          <span>Ask AI Dossier</span>
        </button>
      </div>

      {/* Primary Technical Specs Grid */}
      <div className="mt-5 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-cyan-400" /> Formation:
          </span>
          <span className="font-semibold text-zinc-100">
            {well.formation || "Unspecified"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Total Depth (TD):</span>
          <span className="font-mono font-bold text-amber-400">
            {well.totalDepth ? `${well.totalDepth.toLocaleString()} m` : "N/A"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400 flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-amber-400" /> Geodetic WGS84:
          </span>
          <span className="font-mono text-zinc-300">
            {well.latitude.toFixed(4)}°N, {well.longitude.toFixed(4)}°E
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400 flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-zinc-500" /> Operator / Owner:
          </span>
          <span className="text-zinc-300">
            {well.ownerId ? `Operator ID: ${well.ownerId}` : "Oil & Gas Corporation"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-zinc-500" /> Recorded:
          </span>
          <span className="font-mono text-zinc-400 text-[11px]">
            {new Date(well.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Drilling Telemetry Quick Summary */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-cyan-400" /> Drilling Parameters
          </h3>
          <button
            onClick={() => onViewDrilling(well)}
            className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5"
          >
            <span>Full Logs</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        {loading ? (
          <div className="h-16 rounded bg-zinc-900 animate-pulse"></div>
        ) : details && details.parameters.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5 text-center">
            {(() => {
              const latest = details.parameters[details.parameters.length - 1];
              return (
                <>
                  <div className="rounded bg-zinc-950/60 p-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase">ROP</span>
                    <p className="font-mono text-xs font-bold text-amber-400">
                      {latest.rop ?? "N/A"} <span className="text-[9px]">m/h</span>
                    </p>
                  </div>
                  <div className="rounded bg-zinc-950/60 p-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase">WOB</span>
                    <p className="font-mono text-xs font-bold text-cyan-400">
                      {latest.wob ?? "N/A"} <span className="text-[9px]">t</span>
                    </p>
                  </div>
                  <div className="rounded bg-zinc-950/60 p-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase">Pressure</span>
                    <p className="font-mono text-xs font-bold text-rose-400">
                      {latest.pressure ?? "N/A"} <span className="text-[9px]">psi</span>
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No drilling telemetry recorded.</p>
        )}
      </div>

      {/* Historical Well Events & Incidents */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> Historical Incidents
          </h3>
          <button
            onClick={() => onViewEvents(well)}
            className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5"
          >
            <span>Timeline</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        {loading ? (
          <div className="h-20 rounded bg-zinc-900 animate-pulse"></div>
        ) : details && details.events.length > 0 ? (
          <div className="space-y-2">
            {details.events.map((evt) => (
              <div
                key={evt.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">{evt.eventType}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                      evt.severity === "High"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : evt.severity === "Medium"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {evt.severity}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-amber-300">
                  Depth Interval: {evt.startDepth}m – {evt.endDepth}m
                </p>
                <p className="mt-1 text-[11px] text-zinc-400 leading-tight">
                  {evt.description}
                </p>
                {evt.mitigation && (
                  <p className="mt-1 text-[10px] text-emerald-400/90 italic">
                    Mitigation: {evt.mitigation}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No incidents recorded for this well.</p>
        )}
      </div>

      {/* Nearest Offset Wells Quick Matrix */}
      <div className="mt-5 border-t border-zinc-800 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1">
          <Navigation className="h-3.5 w-3.5 text-amber-400" /> Closest Offset Wells
        </h3>

        {loading ? (
          <div className="h-20 rounded bg-zinc-900 animate-pulse"></div>
        ) : nearby.length > 0 ? (
          <div className="space-y-1.5">
            {nearby.map((nw) => (
              <div
                key={nw.wellId}
                className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-zinc-200">
                    {nw.wellId}
                  </span>
                  <span className="ml-2 text-[11px] text-zinc-400">
                    {nw.formation || "N/A"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-amber-400">
                    {formatDistance(nw.distanceKm)}
                  </span>
                  {nw.sameFormation && (
                    <span className="ml-1 text-[9px] text-emerald-400">
                      ✓ Same Fmt
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No nearby wells within 15 km.</p>
        )}
      </div>
    </aside>
  );
}


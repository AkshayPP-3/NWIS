"use client";

import React, { useState, useEffect } from "react";
import {
  Navigation,
  Compass,
  Layers,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitCompare,
  Sliders,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import type { Well, NearbyWellInfo, TargetLocation } from "@/types/well";
import { formatDistance, getCardinalDirection } from "@/lib/geo";

interface NearbyWellsViewProps {
  wells: Well[];
  selectedWell: Well | null;
  targetLocation: TargetLocation | null;
  onSelectWell: (well: Well) => void;
  onToggleCompare: (wellId: string) => void;
  comparisonWellIds: string[];
}

export default function NearbyWellsView({
  wells,
  selectedWell,
  targetLocation,
  onSelectWell,
  onToggleCompare,
  comparisonWellIds,
}: NearbyWellsViewProps) {
  const [referenceWellId, setReferenceWellId] = useState<string>(
    selectedWell?.wellId || (wells[0]?.wellId ?? "")
  );
  const [radiusKm, setRadiusKm] = useState<number>(12);
  const [nearbyList, setNearbyList] = useState<NearbyWellInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sameFormationOnly, setSameFormationOnly] = useState<boolean>(false);

  // Sync if selected well changes outside
  useEffect(() => {
    if (selectedWell) {
      setReferenceWellId(selectedWell.wellId);
    }
  }, [selectedWell]);

  // Fetch nearby wells using geodetic calculation API
  useEffect(() => {
    if (!referenceWellId && !targetLocation) return;

    setLoading(true);
    let url = "";

    if (targetLocation && referenceWellId === "TARGET_SITE") {
      url = `/api/wells/nearby?lat=${targetLocation.latitude}&lng=${targetLocation.longitude}&radius=${radiusKm}`;
    } else {
      url = `/api/wells/nearby?wellId=${referenceWellId}&radius=${radiusKm}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.wells) {
          setNearbyList(data.wells);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch nearby wells:", err);
        setLoading(false);
      });
  }, [referenceWellId, radiusKm, targetLocation]);

  const activeRefWell = wells.find((w) => w.wellId === referenceWellId);

  const displayedList = sameFormationOnly
    ? nearbyList.filter((w) => w.sameFormation)
    : nearbyList;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 text-zinc-100">
      {/* View Header & Reference Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-100">
                Nearby Wells Geospatial Intelligence
              </h2>
              <p className="text-xs text-zinc-400">
                Rigorous geodetic distance calculations & offset hazard identification
              </p>
            </div>
          </div>
        </div>

        {/* Reference Well Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="reference-well-select"
              className="text-xs font-semibold text-zinc-400"
            >
              Reference Origin:
            </label>
            <select
              id="reference-well-select"
              value={referenceWellId}
              onChange={(e) => setReferenceWellId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
            >
              {wells.map((w) => (
                <option key={w.id} value={w.wellId}>
                  {w.wellId} ({w.name}) &bull; {w.formation || "N/A"}
                </option>
              ))}
              {targetLocation && (
                <option value="TARGET_SITE">🎯 Proposed Drill Target Site</option>
              )}
            </select>
          </div>

          {/* Radius Filter Slider */}
          <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
              <Sliders className="h-3.5 w-3.5 text-amber-400" /> Radius:
            </span>
            <input
              type="range"
              min={2}
              max={25}
              step={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
              aria-label="Filter radius distance in kilometers"
              className="h-1.5 w-24 accent-amber-500 bg-zinc-700 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-xs font-bold text-zinc-200 min-w-[45px]">
              &le; {radiusKm} km
            </span>
          </div>

          {/* Same Formation Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700">
            <input
              type="checkbox"
              checked={sameFormationOnly}
              onChange={(e) => setSameFormationOnly(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <span>Same Formation Only</span>
          </label>
        </div>
      </div>

      {/* Origin Dossier Banner */}
      {activeRefWell && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-amber-500/30 bg-amber-950/10 p-4 text-xs">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Target Origin</span>
            <p className="font-mono text-base font-extrabold text-amber-400">{activeRefWell.wellId}</p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Target Formation</span>
            <p className="font-semibold text-zinc-200">{activeRefWell.formation || "Unspecified"}</p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Target Total Depth</span>
            <p className="font-mono text-zinc-200">{activeRefWell.totalDepth ? `${activeRefWell.totalDepth} m` : "N/A"}</p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Coordinates</span>
            <p className="font-mono text-zinc-300">{activeRefWell.latitude.toFixed(4)}°N, {activeRefWell.longitude.toFixed(4)}°E</p>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
          Detected Offset Wells ({displayedList.length})
        </h3>
        <span className="font-mono text-xs text-zinc-500">
          Ranked by geodetic distance (WGS84 Great-Circle)
        </span>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 rounded-xl bg-zinc-900 animate-pulse border border-zinc-800"></div>
          ))}
        </div>
      ) : displayedList.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-12 text-center text-zinc-400">
          <Navigation className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h4 className="text-base font-bold text-zinc-300">No Offset Wells Located</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            No wells were detected within the selected {radiusKm} km radius
            {sameFormationOnly ? " with matching formation" : ""}. Try expanding the radius slider above.
          </p>
        </div>
      ) : (
        /* Nearby Wells Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedList.map((nw, index) => {
            const isCompared = comparisonWellIds.includes(nw.wellId);
            const status = (nw.status || "").toLowerCase();
            const cardinal = getCardinalDirection(nw.bearingDeg);

            return (
              <div
                key={nw.id}
                className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-md transition-all hover:border-amber-500/50 hover:bg-zinc-900/90"
              >
                <div>
                  {/* Top Bar: Proximity Badge & Status */}
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                        #{index + 1}
                      </span>
                      <span className="font-mono text-base font-extrabold text-zinc-100">
                        {nw.wellId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-400 border border-amber-400/30">
                        {formatDistance(nw.distanceKm)} ({cardinal})
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-zinc-200 truncate">
                    {nw.name}
                  </p>

                  {/* Technical Comparison Specs */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Layers className="h-3 w-3 text-cyan-400" /> Formation:
                      </span>
                      <span className="font-medium text-zinc-200">
                        {nw.formation || "N/A"}
                      </span>
                    </div>

                    {/* Formation Match Indicator */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Stratigraphy Match:</span>
                      {nw.sameFormation ? (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400">
                          ✓ Same Formation
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-400">
                          ≠ Different Formation
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Total Depth:</span>
                      <span className="font-mono text-zinc-200">
                        {nw.totalDepth ? `${nw.totalDepth} m` : "N/A"}
                        {nw.depthDifference !== null && (
                          <span
                            className={`ml-1 text-[10px] ${
                              nw.depthDifference > 0
                                ? "text-amber-400"
                                : "text-cyan-400"
                            }`}
                          >
                            ({nw.depthDifference > 0 ? "+" : ""}
                            {nw.depthDifference}m)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Status:</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                          status === "drilling"
                            ? "text-amber-400 bg-amber-950"
                            : status === "abandoned"
                            ? "text-rose-400 bg-rose-950"
                            : "text-emerald-400 bg-emerald-950"
                        }`}
                      >
                        {nw.status}
                      </span>
                    </div>
                  </div>

                  {/* Offset Hazard / Incident Alert */}
                  {nw.recentEvent && (
                    <div className="mt-3 rounded-lg border border-rose-900/40 bg-rose-950/20 p-2 text-xs">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Offset Hazard: {nw.recentEvent.eventType}</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-zinc-400 line-clamp-2">
                        {nw.recentEvent.description}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] text-amber-300">
                        Depth: {nw.recentEvent.startDepth}m – {nw.recentEvent.endDepth}m
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectWell(nw)}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 text-center text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-1"
                  >
                    <span>View Dossier</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>

                  <button
                    onClick={() => onToggleCompare(nw.wellId)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                      isCompared
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                    title={isCompared ? "Remove from comparison" : "Add to comparison"}
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  X,
  Plus,
  Layers,
  Activity,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  Compass,
  ArrowRight,
} from "lucide-react";
import type { Well, WellWithDetails } from "@/types/well";
import { calculateHaversineDistanceKm } from "@/lib/geo";

interface WellComparisonViewProps {
  wells: Well[];
  comparisonWellIds: string[];
  onToggleCompare: (wellId: string) => void;
  onClearComparison: () => void;
  onSelectWell: (well: Well) => void;
}

export default function WellComparisonView({
  wells,
  comparisonWellIds,
  onToggleCompare,
  onClearComparison,
  onSelectWell,
}: WellComparisonViewProps) {
  const [wellDetailsMap, setWellDetailsMap] = useState<
    Record<string, WellWithDetails>
  >({});
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch full details (with events and parameters) for all compared wells
  useEffect(() => {
    if (comparisonWellIds.length === 0) return;

    setLoading(true);
    const missingIds = comparisonWellIds.filter((id) => !wellDetailsMap[id]);

    if (missingIds.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(
      missingIds.map((id) =>
        fetch(`/api/wells/${id}`)
          .then((r) => r.json())
          .then((data) => ({ id, data }))
      )
    )
      .then((results) => {
        setWellDetailsMap((prev) => {
          const updated = { ...prev };
          results.forEach(({ id, data }) => {
            if (data && !data.error) updated[id] = data;
          });
          return updated;
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch comparison details:", err);
        setLoading(false);
      });
  }, [comparisonWellIds]);

  const activeWells = comparisonWellIds
    .map((id) => wells.find((w) => w.wellId === id))
    .filter((w): w is Well => Boolean(w));

  const availableToAdd = wells.filter(
    (w) => !comparisonWellIds.includes(w.wellId)
  );

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 text-zinc-100">
      {/* Comparison Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
            <GitCompare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-zinc-100">
              Multi-Well Engineering Comparison Matrix
            </h2>
            <p className="text-xs text-zinc-400">
              Correlate lithology, drilling parameters, and incident histories across offset wells
            </p>
          </div>
        </div>

        {/* Quick Add & Clear Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {availableToAdd.length > 0 && activeWells.length < 4 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400 font-medium">Add Well:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onToggleCompare(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                aria-label="Add well to comparison matrix"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="" disabled>
                  Select well to compare...
                </option>
                {availableToAdd.map((w) => (
                  <option key={w.id} value={w.wellId}>
                    {w.wellId} ({w.formation || "N/A"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeWells.length > 0 && (
            <button
              onClick={onClearComparison}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all"
            >
              Clear Comparison
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {activeWells.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-12 text-center text-zinc-400">
          <GitCompare className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-zinc-200">
            No Wells Selected for Comparison
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Select 2 or more wells from the GIS Map, Well Intelligence Panel, or the dropdown above to correlate drilling logs and incidents side-by-side.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {wells.slice(0, 3).map((w) => (
              <button
                key={w.id}
                onClick={() => onToggleCompare(w.wellId)}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-900/60 transition-all"
              >
                <Plus className="h-3 w-3" />
                <span>Add {w.wellId}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Comparison Table Grid */
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="p-3.5 font-bold uppercase tracking-wider text-zinc-400 min-w-[180px] w-1/4">
                  Engineering Metric
                </th>
                {activeWells.map((w) => (
                  <th
                    key={w.id}
                    className="p-3.5 font-bold text-zinc-100 min-w-[220px] border-l border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-extrabold text-amber-400">
                          {w.wellId}
                        </span>
                        <span className="text-[11px] font-normal text-zinc-400 truncate max-w-[120px]">
                          {w.name}
                        </span>
                      </div>
                      <button
                        onClick={() => onToggleCompare(w.wellId)}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                        title="Remove from comparison"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {/* Status */}
              <tr className="hover:bg-zinc-900/30">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60">
                  Status
                </td>
                {activeWells.map((w) => {
                  const st = (w.status || "").toLowerCase();
                  return (
                    <td key={w.id} className="p-3 border-l border-zinc-800">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          st === "drilling"
                            ? "bg-amber-500/20 text-amber-400"
                            : st === "abandoned"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Formation */}
              <tr className="hover:bg-zinc-900/30">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" /> Formation
                </td>
                {activeWells.map((w) => (
                  <td
                    key={w.id}
                    className="p-3 border-l border-zinc-800 font-semibold text-zinc-200"
                  >
                    {w.formation || "Unspecified"}
                  </td>
                ))}
              </tr>

              {/* Total Depth */}
              <tr className="hover:bg-zinc-900/30">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60">
                  Total Depth (m)
                </td>
                {activeWells.map((w) => (
                  <td
                    key={w.id}
                    className="p-3 border-l border-zinc-800 font-mono font-bold text-amber-400"
                  >
                    {w.totalDepth ? `${w.totalDepth.toLocaleString()} m` : "N/A"}
                  </td>
                ))}
              </tr>

              {/* Geodetic Coordinates */}
              <tr className="hover:bg-zinc-900/30">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60 flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-amber-400" /> Coordinates (WGS84)
                </td>
                {activeWells.map((w) => (
                  <td
                    key={w.id}
                    className="p-3 border-l border-zinc-800 font-mono text-zinc-300"
                  >
                    {w.latitude.toFixed(4)}°N, {w.longitude.toFixed(4)}°E
                  </td>
                ))}
              </tr>

              {/* Spacing from First Well */}
              {activeWells.length > 1 && (
                <tr className="hover:bg-zinc-900/30">
                  <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60">
                    Spacing from {activeWells[0].wellId}
                  </td>
                  {activeWells.map((w, idx) => {
                    if (idx === 0) {
                      return (
                        <td
                          key={w.id}
                          className="p-3 border-l border-zinc-800 font-mono text-zinc-500 italic"
                        >
                          Reference Base
                        </td>
                      );
                    }
                    const dist = calculateHaversineDistanceKm(
                      activeWells[0].latitude,
                      activeWells[0].longitude,
                      w.latitude,
                      w.longitude
                    );
                    return (
                      <td
                        key={w.id}
                        className="p-3 border-l border-zinc-800 font-mono font-bold text-cyan-400"
                      >
                        {dist} km
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* Section Header: Drilling Parameters */}
              <tr className="bg-zinc-900/90 border-t-2 border-zinc-800 font-bold text-zinc-300">
                <td colSpan={activeWells.length + 1} className="p-2.5 px-3 uppercase tracking-wider text-[11px] text-amber-400 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Drilling Parameter Benchmarks
                </td>
              </tr>

              {/* Rate of Penetration */}
              <tr className="hover:bg-zinc-900/30">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60">
                  Rate of Penetration (ROP)
                </td>
                {activeWells.map((w) => {
                  const details = wellDetailsMap[w.wellId];
                  const p = details?.parameters?.[details.parameters.length - 1];
                  return (
                    <td key={w.id} className="p-3 border-l border-zinc-800 font-mono">
                      {p?.rop ? (
                        <span className="font-bold text-zinc-100">
                          {p.rop} <span className="text-zinc-500 font-normal">m/h</span>
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Weight on Bit */}
              <tr className="hover:bg-zinc-900/30">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60">
                  Weight on Bit (WOB)
                </td>
                {activeWells.map((w) => {
                  const details = wellDetailsMap[w.wellId];
                  const p = details?.parameters?.[details.parameters.length - 1];
                  return (
                    <td key={w.id} className="p-3 border-l border-zinc-800 font-mono">
                      {p?.wob ? (
                        <span className="font-bold text-zinc-100">
                          {p.wob} <span className="text-zinc-500 font-normal">t</span>
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Torque */}
              <tr className="hover:bg-zinc-900/30">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60">
                  Drilling Torque
                </td>
                {activeWells.map((w) => {
                  const details = wellDetailsMap[w.wellId];
                  const p = details?.parameters?.[details.parameters.length - 1];
                  return (
                    <td key={w.id} className="p-3 border-l border-zinc-800 font-mono">
                      {p?.torque ? (
                        <span className="font-bold text-zinc-100">
                          {p.torque.toLocaleString()}{" "}
                          <span className="text-zinc-500 font-normal">ft-lbs</span>
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Mud Weight */}
              <tr className="hover:bg-zinc-900/30">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60">
                  Mud Weight (SG)
                </td>
                {activeWells.map((w) => {
                  const details = wellDetailsMap[w.wellId];
                  const p = details?.parameters?.[details.parameters.length - 1];
                  return (
                    <td key={w.id} className="p-3 border-l border-zinc-800 font-mono">
                      {p?.mudWeight ? (
                        <span className="font-bold text-zinc-100">{p.mudWeight} SG</span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Pressure */}
              <tr className="hover:bg-zinc-900/30">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60">
                  Circulating / Formation Pressure
                </td>
                {activeWells.map((w) => {
                  const details = wellDetailsMap[w.wellId];
                  const p = details?.parameters?.[details.parameters.length - 1];
                  return (
                    <td key={w.id} className="p-3 border-l border-zinc-800 font-mono">
                      {p?.pressure ? (
                        <span
                          className={`font-bold ${
                            p.pressure >= 3000 ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {p.pressure} psi
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Section Header: Historical Incidents */}
              <tr className="bg-zinc-900/90 border-t-2 border-zinc-800 font-bold text-zinc-300">
                <td colSpan={activeWells.length + 1} className="p-2.5 px-3 uppercase tracking-wider text-[11px] text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Historical Incidents & Well Events
                </td>
              </tr>

              <tr className="hover:bg-zinc-900/30 align-top">
                <td className="p-3 font-semibold text-zinc-400 bg-zinc-950/60">
                  Recorded Events
                </td>
                {activeWells.map((w) => {
                  const details = wellDetailsMap[w.wellId];
                  const evts = details?.events || [];
                  return (
                    <td key={w.id} className="p-3 border-l border-zinc-800">
                      {evts.length === 0 ? (
                        <span className="text-zinc-500 italic">No events</span>
                      ) : (
                        <div className="space-y-2">
                          {evts.map((e) => (
                            <div
                              key={e.id}
                              className="rounded border border-zinc-800 bg-zinc-900/50 p-2 text-[11px]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-zinc-200">
                                  {e.eventType}
                                </span>
                                <span
                                  className={`rounded px-1 py-0.2 text-[9px] font-bold ${
                                    e.severity === "High"
                                      ? "text-rose-400"
                                      : "text-amber-400"
                                  }`}
                                >
                                  {e.severity}
                                </span>
                              </div>
                              <p className="font-mono text-[9px] text-amber-300 mt-0.5">
                                {e.startDepth}m – {e.endDepth}m
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                                {e.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Layers,
  Gauge,
  Sliders,
  Maximize2,
  GitCompare,
  TrendingDown,
} from "lucide-react";
import type { Well, DrillingParameter, WellWithDetails } from "@/types/well";

interface DrillingLogViewProps {
  wells: Well[];
  selectedWell: Well | null;
  onSelectWell: (well: Well) => void;
}

export default function DrillingLogView({
  wells,
  selectedWell,
  onSelectWell,
}: DrillingLogViewProps) {
  const [activeWellId, setActiveWellId] = useState<string>(
    selectedWell?.wellId || (wells[0]?.wellId ?? "")
  );
  const [compareWellId, setCompareWellId] = useState<string>("");
  const [details1, setDetails1] = useState<WellWithDetails | null>(null);
  const [details2, setDetails2] = useState<WellWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Active parameter curve toggles
  const [visibleCurves, setVisibleCurves] = useState({
    rop: true,
    rpm: true,
    torque: true,
    wob: true,
    mudWeight: true,
    pressure: true,
  });

  // Crosshair depth inspection
  const [hoverDepth, setHoverDepth] = useState<number | null>(null);

  // Sync if selectedWell changes
  useEffect(() => {
    if (selectedWell) {
      setActiveWellId(selectedWell.wellId);
    }
  }, [selectedWell]);

  // Fetch well 1
  useEffect(() => {
    if (!activeWellId) return;
    setLoading(true);
    fetch(`/api/wells/${activeWellId}`)
      .then((r) => r.json())
      .then((data) => {
        setDetails1(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load well 1 parameters:", err);
        setLoading(false);
      });
  }, [activeWellId]);

  // Fetch compare well
  useEffect(() => {
    if (!compareWellId) {
      setDetails2(null);
      return;
    }
    fetch(`/api/wells/${compareWellId}`)
      .then((r) => r.json())
      .then((data) => setDetails2(data))
      .catch((err) => console.error("Failed to load well 2 parameters:", err));
  }, [compareWellId]);

  const params1 = useMemo(
    () =>
      (details1?.parameters || []).slice().sort((a, b) => (a.depth || 0) - (b.depth || 0)),
    [details1]
  );

  const params2 = useMemo(
    () =>
      (details2?.parameters || []).slice().sort((a, b) => (a.depth || 0) - (b.depth || 0)),
    [details2]
  );

  // Maximum depth for plotting scale
  const maxDepth = useMemo(() => {
    const d1 = details1?.totalDepth || 4000;
    const d2 = details2?.totalDepth || 0;
    return Math.max(d1, d2, 3500);
  }, [details1, details2]);

  // SVG Chart Dimensions
  const trackWidth = 240;
  const trackHeight = 520;
  const depthAxisWidth = 60;

  // Scale depth to Y coordinate
  const depthToY = (depth: number) => {
    return (depth / maxDepth) * (trackHeight - 40) + 20;
  };

  // Generate SVG polyline path string for a parameter
  const generateCurvePath = (
    params: DrillingParameter[],
    paramKey: keyof DrillingParameter,
    minVal: number,
    maxVal: number
  ) => {
    if (params.length === 0) return "";
    return params
      .map((p) => {
        const d = p.depth ?? 0;
        const y = depthToY(d);
        const rawVal = (p[paramKey] as number) ?? minVal;
        const normalizedX =
          ((rawVal - minVal) / (maxVal - minVal || 1)) * (trackWidth - 30) + 15;
        return `${normalizedX.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 text-zinc-100">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-zinc-100">
              Drilling Parameters & Multi-Track Depth Log
            </h2>
            <p className="text-xs text-zinc-400">
              Real petrophysical and mud logging telemetry profiles vs Measured Depth (MD)
            </p>
          </div>
        </div>

        {/* Well Selection & Overlay Comparison Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="primary-well-select"
              className="text-xs font-semibold text-zinc-400"
            >
              Primary Well:
            </label>
            <select
              id="primary-well-select"
              value={activeWellId}
              onChange={(e) => setActiveWellId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
            >
              {wells.map((w) => (
                <option key={w.id} value={w.wellId}>
                  {w.wellId} ({w.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
            <label
              htmlFor="overlay-well-select"
              className="text-xs font-semibold text-zinc-400 flex items-center gap-1"
            >
              <GitCompare className="h-3.5 w-3.5 text-indigo-400" /> Overlay
              Well:
            </label>
            <select
              id="overlay-well-select"
              value={compareWellId}
              onChange={(e) => setCompareWellId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">None (Single Log)</option>
              {wells
                .filter((w) => w.wellId !== activeWellId)
                .map((w) => (
                  <option key={w.id} value={w.wellId}>
                    {w.wellId} ({w.formation || "N/A"})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parameter Curve Toggle Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-850 bg-zinc-900/60 p-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Sliders className="h-3 w-3 text-amber-400" /> Curve Channels:
          </span>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleCurves.rop}
              onChange={(e) =>
                setVisibleCurves({ ...visibleCurves, rop: e.target.checked })
              }
              className="accent-amber-400"
            />
            <span className="font-semibold text-amber-400">ROP (m/h)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleCurves.rpm}
              onChange={(e) =>
                setVisibleCurves({ ...visibleCurves, rpm: e.target.checked })
              }
              className="accent-emerald-400"
            />
            <span className="font-semibold text-emerald-400">RPM (rev/min)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleCurves.wob}
              onChange={(e) =>
                setVisibleCurves({ ...visibleCurves, wob: e.target.checked })
              }
              className="accent-cyan-400"
            />
            <span className="font-semibold text-cyan-400">WOB (tonnes)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleCurves.torque}
              onChange={(e) =>
                setVisibleCurves({ ...visibleCurves, torque: e.target.checked })
              }
              className="accent-purple-400"
            />
            <span className="font-semibold text-purple-400">Torque (ft-lbs)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleCurves.mudWeight}
              onChange={(e) =>
                setVisibleCurves({ ...visibleCurves, mudWeight: e.target.checked })
              }
              className="accent-blue-400"
            />
            <span className="font-semibold text-blue-400">Mud Wt (SG)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleCurves.pressure}
              onChange={(e) =>
                setVisibleCurves({ ...visibleCurves, pressure: e.target.checked })
              }
              className="accent-rose-400"
            />
            <span className="font-semibold text-rose-400">Pressure (psi)</span>
          </label>
        </div>

        {hoverDepth !== null && (
          <div className="font-mono text-xs text-amber-400 font-bold bg-zinc-950 px-2.5 py-1 rounded border border-amber-500/30">
            Crosshair MD: {hoverDepth} m
          </div>
        )}
      </div>

      {/* Multi-Track Well Log Viewer Canvas */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
        <div className="min-w-[900px] flex justify-center">
          {/* Track Container */}
          <div
            className="relative flex select-none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relativeY = e.clientY - rect.top - 50; // account for header
              if (relativeY >= 0 && relativeY <= trackHeight - 40) {
                const depth = Math.round(
                  (relativeY / (trackHeight - 40)) * maxDepth
                );
                setHoverDepth(depth);
              }
            }}
            onMouseLeave={() => setHoverDepth(null)}
          >
            {/* Horizontal Crosshair Line */}
            {hoverDepth !== null && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-30 border-t border-dashed border-amber-400/70"
                style={{ top: `${depthToY(hoverDepth) + 50}px` }}
              >
                <span className="absolute -left-14 -top-3 rounded bg-amber-500 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-950">
                  {hoverDepth}m
                </span>
              </div>
            )}

            {/* Depth Scale Column */}
            <div className="flex flex-col border-r border-zinc-800 bg-zinc-950 pr-2">
              <div className="h-[50px] border-b border-zinc-800 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 pt-2">
                DEPTH (MD)
              </div>
              <svg width={depthAxisWidth} height={trackHeight} className="overflow-visible">
                {Array.from({ length: 9 }).map((_, i) => {
                  const d = Math.round((i / 8) * maxDepth);
                  const y = depthToY(d);
                  return (
                    <g key={d}>
                      <line
                        x1={depthAxisWidth - 10}
                        y1={y}
                        x2={depthAxisWidth}
                        y2={y}
                        stroke="#52525b"
                        strokeWidth="1"
                      />
                      <text
                        x={depthAxisWidth - 14}
                        y={y + 3}
                        fill="#a1a1aa"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {d}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* TRACK 1: ROP (0 - 40 m/h) & RPM (0 - 180 rev/min) */}
            <div className="flex flex-col border-r border-zinc-800 bg-zinc-900/30">
              {/* Track Header */}
              <div className="h-[50px] border-b border-zinc-800 px-3 pt-1.5 text-center">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-amber-400">ROP (0–40 m/h)</span>
                  <span className="text-emerald-400">RPM (0–180)</span>
                </div>
                <span className="text-[9px] text-zinc-400 tracking-wider">TRACK 1: PENETRATION & ROTARY</span>
              </div>

              {/* Track Grid & Curves */}
              <svg width={trackWidth} height={trackHeight} className="bg-zinc-950/40">
                {/* Horizontal Depth Grid Lines */}
                {Array.from({ length: 9 }).map((_, i) => {
                  const y = depthToY((i / 8) * maxDepth);
                  return (
                    <line
                      key={i}
                      x1={0}
                      y1={y}
                      x2={trackWidth}
                      y2={y}
                      stroke="#27272a"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  );
                })}

                {/* Vertical Parameter Grid Lines */}
                {[0.25, 0.5, 0.75].map((pct) => (
                  <line
                    key={pct}
                    x1={pct * trackWidth}
                    y1={0}
                    x2={pct * trackWidth}
                    y2={trackHeight}
                    stroke="#27272a"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                ))}

                {/* Primary Well Curves */}
                {visibleCurves.rop && (
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    points={generateCurvePath(params1, "rop", 0, 40)}
                  />
                )}
                {visibleCurves.rpm && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    points={generateCurvePath(params1, "rpm", 0, 180)}
                  />
                )}

                {/* Compare Well Curves (Dashed) */}
                {details2 && visibleCurves.rop && (
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    points={generateCurvePath(params2, "rop", 0, 40)}
                  />
                )}
                {details2 && visibleCurves.rpm && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    points={generateCurvePath(params2, "rpm", 0, 180)}
                  />
                )}
              </svg>
            </div>

            {/* TRACK 2: WOB (0 - 30 tonnes) & Torque (0 - 12000 ft-lbs) */}
            <div className="flex flex-col border-r border-zinc-800 bg-zinc-900/30">
              <div className="h-[50px] border-b border-zinc-800 px-3 pt-1.5 text-center">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-cyan-400">WOB (0–30 t)</span>
                  <span className="text-purple-400">TORQUE (0–12k)</span>
                </div>
                <span className="text-[9px] text-zinc-400 tracking-wider">TRACK 2: MECHANICAL DYNAMICS</span>
              </div>

              <svg width={trackWidth} height={trackHeight} className="bg-zinc-950/40">
                {Array.from({ length: 9 }).map((_, i) => {
                  const y = depthToY((i / 8) * maxDepth);
                  return (
                    <line
                      key={i}
                      x1={0}
                      y1={y}
                      x2={trackWidth}
                      y2={y}
                      stroke="#27272a"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  );
                })}

                {[0.25, 0.5, 0.75].map((pct) => (
                  <line
                    key={pct}
                    x1={pct * trackWidth}
                    y1={0}
                    x2={pct * trackWidth}
                    y2={trackHeight}
                    stroke="#27272a"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                ))}

                {visibleCurves.wob && (
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    points={generateCurvePath(params1, "wob", 0, 30)}
                  />
                )}
                {visibleCurves.torque && (
                  <polyline
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="2"
                    points={generateCurvePath(params1, "torque", 0, 12000)}
                  />
                )}

                {details2 && visibleCurves.wob && (
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    points={generateCurvePath(params2, "wob", 0, 30)}
                  />
                )}
                {details2 && visibleCurves.torque && (
                  <polyline
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    points={generateCurvePath(params2, "torque", 0, 12000)}
                  />
                )}
              </svg>
            </div>

            {/* TRACK 3: Mud Weight (1.0 - 1.4 SG) & Pressure (0 - 4500 psi) */}
            <div className="flex flex-col border-r border-zinc-800 bg-zinc-900/30">
              <div className="h-[50px] border-b border-zinc-800 px-3 pt-1.5 text-center">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-blue-400">MUD WT (1.0–1.4 SG)</span>
                  <span className="text-rose-400">PRESSURE (0–4.5k psi)</span>
                </div>
                <span className="text-[9px] text-zinc-400 tracking-wider">TRACK 3: HYDRAULIC BARRIERS</span>
              </div>

              <svg width={trackWidth} height={trackHeight} className="bg-zinc-950/40">
                {Array.from({ length: 9 }).map((_, i) => {
                  const y = depthToY((i / 8) * maxDepth);
                  return (
                    <line
                      key={i}
                      x1={0}
                      y1={y}
                      x2={trackWidth}
                      y2={y}
                      stroke="#27272a"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  );
                })}

                {[0.25, 0.5, 0.75].map((pct) => (
                  <line
                    key={pct}
                    x1={pct * trackWidth}
                    y1={0}
                    x2={pct * trackWidth}
                    y2={trackHeight}
                    stroke="#27272a"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                ))}

                {/* Overpressure Hazard Shading (>3000 psi) */}
                <rect
                  x={0}
                  y={depthToY(1800)}
                  width={trackWidth}
                  height={depthToY(2600) - depthToY(1800)}
                  fill="rgba(244, 63, 94, 0.08)"
                />

                {visibleCurves.mudWeight && (
                  <polyline
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    points={generateCurvePath(params1, "mudWeight", 1.0, 1.4)}
                  />
                )}
                {visibleCurves.pressure && (
                  <polyline
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    points={generateCurvePath(params1, "pressure", 0, 4500)}
                  />
                )}

                {details2 && visibleCurves.mudWeight && (
                  <polyline
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    points={generateCurvePath(params2, "mudWeight", 1.0, 1.4)}
                  />
                )}
                {details2 && visibleCurves.pressure && (
                  <polyline
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    points={generateCurvePath(params2, "pressure", 0, 4500)}
                  />
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Engineering Annotation */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-6 bg-amber-400 inline-block"></span>
            <span className="font-semibold text-zinc-200">
              Solid Line: Primary Well ({activeWellId})
            </span>
          </div>
          {details2 && (
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-6 border-b-2 border-dashed border-indigo-400 inline-block"></span>
              <span className="font-semibold text-indigo-300">
                Dashed Line: Overlay Well ({compareWellId})
              </span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-zinc-400">
          Hover cursor across tracks to inspect synchronized measured depth (MD) values.
        </p>
      </div>
    </div>
  );
}


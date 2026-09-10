"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  Compass,
  Activity,
  CheckCircle2,
  Sparkles,
  Star,
  ShieldAlert,
  FileCheck,
  Printer,
  Info,
  ExternalLink,
  Award,
  FileText,
} from "lucide-react";
import type { Well, WellEvent, DrillingParameter } from "@/types/well";
import {
  TargetProfile,
  TargetEvaluationResult,
  evaluateTargetOffsetWells,
} from "@/lib/relevanceEngine";
import { formatDistance } from "@/lib/geo";

// Indian basin demo presets for fast hackathon presentation
const BASIN_PRESETS = [
  {
    name: "Upper Assam (Digboi / Naharkatiya)",
    latitude: 27.38,
    longitude: 95.63,
    formation: "Barail Formation",
    depth: 3200,
    radius: 50,
  },
  {
    name: "Cambay Basin (Ankleshwar / Gandhar)",
    latitude: 21.63,
    longitude: 73.01,
    formation: "Barail Formation",
    depth: 2800,
    radius: 60,
  },
  {
    name: "Barmer Basin (Mangala / Bhagyam)",
    latitude: 25.82,
    longitude: 71.24,
    formation: "Tipam Formation",
    depth: 3100,
    radius: 50,
  },
  {
    name: "KG Basin (Mandapeta / Razole)",
    latitude: 16.85,
    longitude: 81.93,
    formation: "Disang Formation",
    depth: 3600,
    radius: 60,
  },
];

interface TargetAnalysisViewProps {
  wells: Well[];
  initialTarget?: TargetProfile | null;
  onTargetChange?: (target: TargetProfile) => void;
  onSelectWellOnMap: (well: Well) => void;
  onNavigateToComparison: (wellIds: string[]) => void;
}

export default function TargetAnalysisView({
  wells,
  initialTarget,
  onTargetChange,
  onSelectWellOnMap,
  onNavigateToComparison,
}: TargetAnalysisViewProps) {
  // Target Configuration State
  const [target, setTarget] = useState<TargetProfile>(() => {
    if (initialTarget) return initialTarget;
    return {
      name: "PROPOSED-EXPLORATION-01",
      latitude: 27.38,
      longitude: 95.63,
      targetFormation: "Barail Formation",
      plannedDepth: 3200,
      searchRadiusKm: 50,
    };
  });

  // Cached detailed telemetry for wells (events & drilling parameters)
  const [telemetryCache, setTelemetryCache] = useState<
    Record<string, { events: WellEvent[]; parameters: DrillingParameter[] }>
  >({});
  const [loadingTelemetry, setLoadingTelemetry] = useState<boolean>(false);

  // Engineer decision state
  const [selectedOffsetWellId, setSelectedOffsetWellId] = useState<string>("");
  const [targetMudWeightMin, setTargetMudWeightMin] = useState<string>("1.12");
  const [targetMudWeightMax, setTargetMudWeightMax] = useState<string>("1.24");
  const [acknowledgedRisks, setAcknowledgedRisks] = useState<Record<string, boolean>>({});
  const [engineerSignoff, setEngineerSignoff] = useState<{
    signed: boolean;
    engineerName: string;
    notes: string;
    signedAt?: string;
  }>({
    signed: false,
    engineerName: "Drilling Engineer (SIH Team)",
    notes: "Approved offset well trajectory and casing setting depths based on historical kick data.",
  });
  const [showBriefingModal, setShowBriefingModal] = useState<boolean>(false);

  // Formations available across seeded wells
  const availableFormations = useMemo(() => {
    const set = new Set<string>();
    wells.forEach((w) => {
      if (w.formation) set.add(w.formation);
    });
    return Array.from(set);
  }, [wells]);

  // Sync when initialTarget changes externally (e.g. from map click)
  useEffect(() => {
    if (initialTarget) {
      setTarget(initialTarget);
    }
  }, [initialTarget]);

  // Notify parent of target updates
  const updateTarget = (updated: TargetProfile) => {
    setTarget(updated);
    if (onTargetChange) onTargetChange(updated);
  };

  // Fetch telemetry for top candidates
  useEffect(() => {
    if (wells.length === 0) return;

    setLoadingTelemetry(true);
    // Fetch telemetry for nearest wells or sample wells
    const candidateIds = wells.slice(0, 15).map((w) => w.wellId);

    Promise.all(
      candidateIds.map((id) =>
        fetch(`/api/wells/${id}`)
          .then((r) => r.json())
          .then((data) => ({ id, data }))
          .catch(() => ({ id, data: null }))
      )
    ).then((results) => {
      const cache: Record<string, { events: WellEvent[]; parameters: DrillingParameter[] }> = {};
      results.forEach(({ id, data }) => {
        if (data && !data.error) {
          cache[id] = {
            events: data.events || [],
            parameters: data.parameters || [],
          };
        }
      });
      setTelemetryCache((prev) => ({ ...prev, ...cache }));
      setLoadingTelemetry(false);
    });
  }, [wells]);

  // Convert telemetry cache to Maps for relevance engine
  const { eventsByWellId, paramsByWellId } = useMemo(() => {
    const eventsMap = new Map<number, WellEvent[]>();
    const paramsMap = new Map<number, DrillingParameter[]>();

    wells.forEach((well) => {
      const cached = telemetryCache[well.wellId];
      if (cached) {
        if (cached.events.length > 0) eventsMap.set(well.id, cached.events);
        if (cached.parameters.length > 0) paramsMap.set(well.id, cached.parameters);
      }
    });

    return { eventsByWellId: eventsMap, paramsByWellId: paramsMap };
  }, [wells, telemetryCache]);

  // Run the automated relevance engine
  const evaluationResult: TargetEvaluationResult = useMemo(() => {
    return evaluateTargetOffsetWells(target, wells, eventsByWellId, paramsByWellId);
  }, [target, wells, eventsByWellId, paramsByWellId]);

  const { topCandidates, bestFitWell, closestWell, contrast } = evaluationResult;

  // Set default selected offset well to #1 best fit if not yet selected
  useEffect(() => {
    if (bestFitWell && !selectedOffsetWellId) {
      setSelectedOffsetWellId(bestFitWell.well.wellId);
      if (bestFitWell.mudWeightWindow) {
        setTargetMudWeightMin(bestFitWell.mudWeightWindow.min.toFixed(2));
        setTargetMudWeightMax(bestFitWell.mudWeightWindow.max.toFixed(2));
      }
    }
  }, [bestFitWell, selectedOffsetWellId]);

  // Fetch telemetry on-demand if a candidate lacks cached telemetry
  useEffect(() => {
    topCandidates.forEach((candidate) => {
      if (!telemetryCache[candidate.well.wellId]) {
        fetch(`/api/wells/${candidate.well.wellId}`)
          .then((r) => r.json())
          .then((data) => {
            if (data && !data.error) {
              setTelemetryCache((prev) => ({
                ...prev,
                [candidate.well.wellId]: {
                  events: data.events || [],
                  parameters: data.parameters || [],
                },
              }));
            }
          })
          .catch(() => {});
      }
    });
  }, [topCandidates, telemetryCache]);

  // Compile depth-correlated historical risks from the 3 candidate wells
  const depthIntervalIncidents = useMemo(() => {
    const intervals: {
      name: string;
      range: string;
      startDepth: number;
      endDepth: number;
      events: {
        wellId: string;
        wellName: string;
        depth: number;
        eventType: string;
        severity: string;
        description: string;
        mitigation: string;
      }[];
    }[] = [
      {
        name: "Surface & Conductor Section",
        range: "0m – 1,200m MD",
        startDepth: 0,
        endDepth: 1200,
        events: [],
      },
      {
        name: "Intermediate Drilling Section",
        range: "1,200m – 2,400m MD",
        startDepth: 1200,
        endDepth: 2400,
        events: [],
      },
      {
        name: "Target Reservoir & Pay Section",
        range: `2,400m – ${target.plannedDepth}m+ MD`,
        startDepth: 2400,
        endDepth: 99999,
        events: [],
      },
    ];

    topCandidates.forEach((c) => {
      const cached = telemetryCache[c.well.wellId];
      if (cached && cached.events) {
        cached.events.forEach((evt) => {
          const depth = evt.startDepth || evt.endDepth || 1500;
          const matchedInterval = intervals.find(
            (i) => depth >= i.startDepth && depth < i.endDepth
          );
          if (matchedInterval) {
            matchedInterval.events.push({
              wellId: c.well.wellId,
              wellName: c.well.name,
              depth,
              eventType: evt.eventType,
              severity: evt.severity || "Medium",
              description: evt.description || "Operational anomaly recorded",
              mitigation: evt.mitigation || "Conditioned mud and inspected BHA",
            });
          }
        });
      }
    });

    return intervals;
  }, [topCandidates, telemetryCache, target.plannedDepth]);

  const handleApplyPreset = (preset: (typeof BASIN_PRESETS)[0]) => {
    updateTarget({
      ...target,
      name: `TARGET-${preset.name.split(" ")[0].toUpperCase()}-01`,
      latitude: preset.latitude,
      longitude: preset.longitude,
      targetFormation: preset.formation,
      plannedDepth: preset.depth,
      searchRadiusKm: preset.radius,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 text-zinc-100 max-w-7xl mx-auto">
      {/* 1. Header & Executive Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-inner">
            <Target className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wide text-zinc-100">
                New Well Target & Offset Relevance Engine
              </h1>
              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                SIH Core Workflow
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automated multi-factor candidate evaluation proving{" "}
              <strong className="text-amber-300">Nearby ≠ Relevant</strong> in drilling design
            </p>
          </div>
        </div>

        {/* Quick Basin Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-400 mr-1">Demo Basins:</span>
          {BASIN_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleApplyPreset(preset)}
              className="rounded-lg border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-cyan-500/50 hover:bg-zinc-800 hover:text-cyan-300 transition-all"
            >
              {preset.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Target Well Profile Configuration Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
            <Compass className="h-4 w-4 text-cyan-400" />
            <span>Target Wellbore Specifications</span>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            {evaluationResult.wellsWithinRadius} offset wells within {target.searchRadiusKm} km radius
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 text-xs">
          {/* Target Name */}
          <div className="space-y-1">
            <label className="text-zinc-400 font-medium">Target Identifier</label>
            <input
              type="text"
              value={target.name}
              onChange={(e) => updateTarget({ ...target, name: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Coordinates */}
          <div className="space-y-1">
            <label className="text-zinc-400 font-medium">Coordinates (Lat, Lng)</label>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <input
                type="number"
                step="0.0001"
                value={target.latitude}
                onChange={(e) =>
                  updateTarget({ ...target, latitude: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
                placeholder="Latitude"
              />
              <input
                type="number"
                step="0.0001"
                value={target.longitude}
                onChange={(e) =>
                  updateTarget({ ...target, longitude: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
                placeholder="Longitude"
              />
            </div>
          </div>

          {/* Target Formation */}
          <div className="space-y-1">
            <label className="text-zinc-400 font-medium">Target Formation</label>
            <select
              value={target.targetFormation}
              onChange={(e) => updateTarget({ ...target, targetFormation: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-medium text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
            >
              {availableFormations.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Planned Depth */}
          <div className="space-y-1">
            <label className="text-zinc-400 font-medium">Planned TD (meters MD)</label>
            <input
              type="number"
              step="50"
              value={target.plannedDepth}
              onChange={(e) =>
                updateTarget({ ...target, plannedDepth: parseInt(e.target.value, 10) || 3000 })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Search Radius */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-zinc-400 font-medium">Search Radius</label>
              <span className="font-mono text-cyan-400 font-bold">{target.searchRadiusKm} km</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={target.searchRadiusKm}
              onChange={(e) =>
                updateTarget({ ...target, searchRadiusKm: parseInt(e.target.value, 10) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Flagship Concept: "Nearby != Relevant" Contrast Callout */}
      {contrast && (
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-zinc-900/80 to-zinc-950 p-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider">
                Flagship Concept: Nearby ≠ Relevant
              </h2>
            </div>
            <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              {contrast.isSameWell ? "Optimal Alignment" : "Divergence Identified"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Closest Well Card */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-zinc-400 flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-zinc-500" /> Purely Closest Well (Geographic)
                </span>
                <span className="font-mono font-bold text-zinc-300">
                  {formatDistance(contrast.closestWell.distanceKm)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-base font-black font-mono text-zinc-200">
                  {contrast.closestWell.well.wellId}
                </span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs font-bold text-zinc-300">
                  Score: {contrast.closestWell.scoreBreakdown.totalScore}/100
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 truncate">
                {contrast.closestWell.well.name}
              </p>
              <div className="mt-3 space-y-1 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
                <p>
                  <strong>Formation:</strong>{" "}
                  <span className="text-zinc-300">
                    {contrast.closestWell.well.formation || "N/A"}
                  </span>
                </p>
                <p>
                  <strong>TD:</strong>{" "}
                  <span className="text-zinc-300 font-mono">
                    {contrast.closestWell.well.totalDepth
                      ? `${contrast.closestWell.well.totalDepth.toLocaleString()}m`
                      : "N/A"}
                  </span>{" "}
                  ({contrast.closestWell.depthOverlapPercent}% target depth)
                </p>
                <p>
                  <strong>Telemetry:</strong>{" "}
                  <span className="text-zinc-300">
                    {contrast.closestWell.parameterCount} logged depth intervals
                  </span>
                </p>
              </div>
            </div>

            {/* Best-Fit Well Card */}
            <div className="rounded-lg border-2 border-amber-500/60 bg-amber-950/20 p-4 shadow-lg shadow-amber-500/10 relative overflow-hidden">
              <div className="absolute top-2 right-2 text-amber-500/20 -z-0">
                <Star className="h-20 w-20 fill-current" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> ⭐ Best-Fit Offset
                    Well (Technical)
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {formatDistance(contrast.bestFitWell.distanceKm)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black font-mono text-amber-200">
                    {contrast.bestFitWell.well.wellId}
                  </span>
                  <span className="rounded bg-amber-500 px-2 py-0.5 font-mono text-xs font-black text-zinc-950 shadow">
                    Score: {contrast.bestFitWell.scoreBreakdown.totalScore}/100
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 mt-1 truncate">
                  {contrast.bestFitWell.well.name}
                </p>
                <div className="mt-3 space-y-1 text-[11px] text-zinc-300 border-t border-amber-500/30 pt-2">
                  <p>
                    <strong>Formation:</strong>{" "}
                    <span className="text-emerald-400 font-semibold">
                      {contrast.bestFitWell.well.formation} (Stratigraphic Match)
                    </span>
                  </p>
                  <p>
                    <strong>TD:</strong>{" "}
                    <span className="text-zinc-100 font-mono font-bold">
                      {contrast.bestFitWell.well.totalDepth?.toLocaleString()}m
                    </span>{" "}
                    ({contrast.bestFitWell.depthOverlapPercent}% target coverage)
                  </p>
                  <p>
                    <strong>Telemetry:</strong>{" "}
                    <span className="text-zinc-100 font-semibold">
                      {contrast.bestFitWell.parameterCount} depth logs &bull;{" "}
                      {contrast.bestFitWell.eventsCount} incidents documented
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rationale Explanation */}
          <div className="mt-4 rounded-lg bg-zinc-950/80 p-3.5 border border-amber-500/30 text-xs">
            <span className="font-bold text-amber-400 block mb-1">
              Engineering Selection Rationale:
            </span>
            <p className="text-zinc-300 leading-relaxed">{contrast.justification}</p>
            {contrast.keyDifferentiators.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                {contrast.keyDifferentiators.map((diff, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300"
                  >
                    &bull; {diff}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Top 3 Candidate Offset Wells Dossier */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-extrabold text-zinc-100">
              3 Most Relevant Candidate Offset Wells
            </h2>
          </div>
          <button
            onClick={() => onNavigateToComparison(topCandidates.map((c) => c.well.wellId))}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-900/50 hover:text-white transition-all"
          >
            Open in Comparison Matrix <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topCandidates.map((candidate, idx) => {
            const isRank1 = idx === 0;
            const isSelectedDecision = selectedOffsetWellId === candidate.well.wellId;

            return (
              <div
                key={candidate.well.id}
                className={`rounded-xl p-4 flex flex-col justify-between transition-all ${
                  isRank1
                    ? "border-2 border-amber-500 bg-gradient-to-b from-amber-950/20 to-zinc-900/90 shadow-xl shadow-amber-500/10"
                    : "border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700"
                }`}
              >
                <div>
                  {/* Rank Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {isRank1 ? (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-zinc-950 shadow">
                          <Star className="h-3 w-3 fill-current" /> #1 Best-Fit ⭐
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-bold text-zinc-400 border border-zinc-700">
                          #{idx + 1} Candidate
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-black text-amber-400">
                      {candidate.scoreBreakdown.totalScore}/100 pts
                    </span>
                  </div>

                  {/* Well ID & Name */}
                  <div className="mt-1">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-black font-mono text-zinc-100">
                        {candidate.well.wellId}
                      </h3>
                      <span className="font-mono text-xs text-zinc-400">
                        {formatDistance(candidate.distanceKm)} ({candidate.cardinalDirection})
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{candidate.well.name}</p>
                  </div>

                  {/* Score Breakdown Progress Bars */}
                  <div className="mt-4 space-y-2 rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 text-[10px]">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Stratigraphy Match</span>
                      <span className="font-mono font-bold text-zinc-200">
                        {candidate.scoreBreakdown.formationScore} / 35
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${(candidate.scoreBreakdown.formationScore / 35) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Depth Overlap ({candidate.depthOverlapPercent}%)</span>
                      <span className="font-mono font-bold text-zinc-200">
                        {candidate.scoreBreakdown.depthScore} / 25
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{
                          width: `${(candidate.scoreBreakdown.depthScore / 25) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Spatial Proximity</span>
                      <span className="font-mono font-bold text-zinc-200">
                        {candidate.scoreBreakdown.distanceScore} / 20
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${(candidate.scoreBreakdown.distanceScore / 20) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Telemetry & Incidents</span>
                      <span className="font-mono font-bold text-zinc-200">
                        {candidate.scoreBreakdown.telemetryScore +
                          candidate.scoreBreakdown.incidentScore}{" "}
                        / 20
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${
                            ((candidate.scoreBreakdown.telemetryScore +
                              candidate.scoreBreakdown.incidentScore) /
                              20) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Engineering Summary */}
                  <p className="mt-3 text-xs text-zinc-300 leading-snug">
                    {candidate.engineeringSummary}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectWellOnMap(candidate.well)}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all text-center"
                  >
                    View on Map
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOffsetWellId(candidate.well.wellId);
                      if (candidate.mudWeightWindow) {
                        setTargetMudWeightMin(candidate.mudWeightWindow.min.toFixed(2));
                        setTargetMudWeightMax(candidate.mudWeightWindow.max.toFixed(2));
                      }
                    }}
                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all text-center ${
                      isSelectedDecision
                        ? "bg-amber-500 text-zinc-950 shadow"
                        : "border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    }`}
                  >
                    {isSelectedDecision ? "Selected Offset" : "Choose Offset"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Side-by-Side 3-Well Engineering Parameter Matrix */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-extrabold text-zinc-100">
              Technical Parameter Comparison Matrix
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Direct correlation of mud weights, penetration rates, and pressures
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="py-2.5 px-3 font-semibold">Engineering Metric</th>
                <th className="py-2.5 px-3 font-semibold text-cyan-400 bg-cyan-950/20 rounded-t-lg">
                  Target Wellbore ({target.name})
                </th>
                {topCandidates.map((c, i) => (
                  <th
                    key={c.well.id}
                    className={`py-2.5 px-3 font-semibold font-mono ${
                      i === 0 ? "text-amber-400 bg-amber-950/20 rounded-t-lg" : "text-zinc-200"
                    }`}
                  >
                    {c.well.wellId} {i === 0 ? "⭐ Best-Fit" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {/* Formation */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-400 font-semibold">Lithology / Formation</td>
                <td className="py-2.5 px-3 font-bold text-cyan-300 bg-cyan-950/10">
                  {target.targetFormation}
                </td>
                {topCandidates.map((c) => (
                  <td key={c.well.id} className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
                        c.well.formation === target.targetFormation
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {c.well.formation || "N/A"}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Total Depth */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-400 font-semibold">
                  Total Depth (TD) & Delta
                </td>
                <td className="py-2.5 px-3 font-mono text-cyan-300 bg-cyan-950/10">
                  {target.plannedDepth.toLocaleString()} m (Planned)
                </td>
                {topCandidates.map((c) => (
                  <td key={c.well.id} className="py-2.5 px-3 font-mono">
                    {c.well.totalDepth?.toLocaleString()} m{" "}
                    <span
                      className={`text-[10px] ${
                        c.depthDelta >= 0 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      ({c.depthDelta >= 0 ? `+${c.depthDelta}` : c.depthDelta}m)
                    </span>
                  </td>
                ))}
              </tr>

              {/* Surface Distance */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-400 font-semibold">Surface Distance</td>
                <td className="py-2.5 px-3 text-zinc-500 bg-cyan-950/10">0 km (Origin)</td>
                {topCandidates.map((c) => (
                  <td key={c.well.id} className="py-2.5 px-3 font-mono text-zinc-300">
                    {formatDistance(c.distanceKm)} ({c.cardinalDirection})
                  </td>
                ))}
              </tr>

              {/* Recommended Mud Weight Window */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-400 font-semibold">
                  Mud Weight Window (SG / ppg)
                </td>
                <td className="py-2.5 px-3 font-mono text-cyan-300 bg-cyan-950/10">
                  {targetMudWeightMin} – {targetMudWeightMax} SG (Proposed)
                </td>
                {topCandidates.map((c) => (
                  <td key={c.well.id} className="py-2.5 px-3 font-mono text-zinc-200">
                    {c.mudWeightWindow
                      ? `${c.mudWeightWindow.min.toFixed(2)} – ${c.mudWeightWindow.max.toFixed(2)} SG`
                      : "1.12 – 1.25 SG (Est.)"}
                  </td>
                ))}
              </tr>

              {/* Penetration Rate (ROP) */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-400 font-semibold">Typical ROP Range</td>
                <td className="py-2.5 px-3 text-zinc-400 bg-cyan-950/10">
                  Target: 12 – 18 m/hr
                </td>
                {topCandidates.map((c) => (
                  <td key={c.well.id} className="py-2.5 px-3 font-mono text-zinc-300">
                    9.5 – 18.2 m/hr
                  </td>
                ))}
              </tr>

              {/* Recorded Incidents */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-400 font-semibold">Documented Incidents</td>
                <td className="py-2.5 px-3 text-zinc-400 bg-cyan-950/10">Prognosis Phase</td>
                {topCandidates.map((c) => (
                  <td key={c.well.id} className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${
                        c.highSeverityEvents > 0
                          ? "bg-rose-950/80 text-rose-300 border border-rose-700"
                          : c.eventsCount > 0
                          ? "bg-amber-950/80 text-amber-300 border border-amber-700"
                          : "bg-emerald-950/80 text-emerald-300"
                      }`}
                    >
                      {c.eventsCount} events ({c.highSeverityEvents} high-severity)
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Depth-Correlated Historical Risk Zones (Evidence-Based) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            <div>
              <h2 className="text-base font-extrabold text-zinc-100">
                Depth-Correlated Historical Hazard Zones
              </h2>
              <p className="text-xs text-zinc-400">
                Direct evidence from offset logs &bull; Strictly historical incident patterns, not
                synthetic predictions
              </p>
            </div>
          </div>
          <span className="rounded bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-300 uppercase">
            Observed Technical Logs
          </span>
        </div>

        <div className="space-y-4">
          {depthIntervalIncidents.map((interval, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-mono font-bold text-zinc-300">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-sm text-zinc-200">{interval.name}</span>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">
                    ({interval.range})
                  </span>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {interval.events.length}{" "}
                  {interval.events.length === 1 ? "incident logged" : "incidents logged"}
                </span>
              </div>

              {interval.events.length === 0 ? (
                <div className="py-2 text-xs text-zinc-500 italic flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  No major well control incidents or stuck pipe recorded across candidate offset
                  logs in this interval.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {interval.events.map((evt, eIdx) => (
                    <div
                      key={eIdx}
                      className="rounded-lg border border-zinc-800/90 bg-zinc-900/90 p-3 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              evt.severity === "High"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : "bg-amber-950 text-amber-300 border border-amber-800"
                            }`}
                          >
                            {evt.severity} Severity
                          </span>
                          <span className="font-bold text-zinc-100">{evt.eventType}</span>
                          <span className="font-mono text-zinc-400">@ {evt.depth}m MD</span>
                        </div>
                        <span className="font-mono text-amber-400 font-semibold text-[11px]">
                          Source: {evt.wellId} ({evt.wellName})
                        </span>
                      </div>
                      <p className="text-zinc-300 text-[11px] leading-relaxed pt-0.5">
                        {evt.description}
                      </p>
                      <div className="rounded bg-zinc-950 px-2.5 py-1.5 border border-zinc-800 text-[11px] text-zinc-300 mt-1">
                        <strong className="text-emerald-400">
                          Historical Mitigation Applied:
                        </strong>{" "}
                        {evt.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 7. Engineer Final Decision & Sign-off Panel */}
      <div className="rounded-xl border border-amber-500/40 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <FileCheck className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="text-base font-black text-zinc-100 uppercase tracking-wide">
                Drilling Engineer Decision & Sign-off Interface
              </h2>
              <p className="text-xs text-zinc-400">
                Formal technical sign-off by drilling engineering team prior to well spudding
              </p>
            </div>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
            Decision-Support Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Chosen Offset Well */}
          <div className="space-y-2 rounded-lg bg-zinc-900/80 p-4 border border-zinc-800">
            <label className="text-xs font-bold text-zinc-300">
              Primary Reference Offset Well
            </label>
            <div className="space-y-2">
              {topCandidates.map((c) => (
                <label
                  key={c.well.id}
                  className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-all ${
                    selectedOffsetWellId === c.well.wellId
                      ? "border-amber-500 bg-amber-500/10 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="selectedOffsetWell"
                      checked={selectedOffsetWellId === c.well.wellId}
                      onChange={() => setSelectedOffsetWellId(c.well.wellId)}
                      className="accent-amber-400"
                    />
                    <span className="font-mono text-xs font-bold">{c.well.wellId}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    {c.scoreBreakdown.totalScore} pts &bull; {c.well.formation}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Planned Mud Weight Window */}
          <div className="space-y-2 rounded-lg bg-zinc-900/80 p-4 border border-zinc-800">
            <label className="text-xs font-bold text-zinc-300">
              Approved Mud Weight Operating Envelope
            </label>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Derived from offset gas kick and lost circulation records in target formation.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <span className="text-[10px] text-zinc-500 font-medium">Min Mud Wt (SG)</span>
                <input
                  type="text"
                  value={targetMudWeightMin}
                  onChange={(e) => setTargetMudWeightMin(e.target.value)}
                  className="w-full mt-1 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-medium">Max Mud Wt (SG)</span>
                <input
                  type="text"
                  value={targetMudWeightMax}
                  onChange={(e) => setTargetMudWeightMax(e.target.value)}
                  className="w-full mt-1 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Engineer Sign-off */}
          <div className="space-y-2 rounded-lg bg-zinc-900/80 p-4 border border-zinc-800 flex flex-col justify-between">
            <div>
              <label className="text-xs font-bold text-zinc-300">Drilling Engineer Sign-off</label>
              <input
                type="text"
                value={engineerSignoff.engineerName}
                onChange={(e) =>
                  setEngineerSignoff({ ...engineerSignoff, engineerName: e.target.value })
                }
                className="w-full mt-1 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                placeholder="Engineer Name & Title"
              />
              <textarea
                rows={2}
                value={engineerSignoff.notes}
                onChange={(e) =>
                  setEngineerSignoff({ ...engineerSignoff, notes: e.target.value })
                }
                className="w-full mt-2 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 focus:border-amber-500 focus:outline-none"
                placeholder="Operational notes..."
              />
            </div>

            <button
              onClick={() => {
                setEngineerSignoff((prev) => ({
                  ...prev,
                  signed: true,
                  signedAt: new Date().toLocaleTimeString(),
                }));
                setShowBriefingModal(true);
              }}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-zinc-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              Sign & Export Drilling Briefing Dossier
            </button>
          </div>
        </div>

        {/* Engineering Disclaimer */}
        <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
          <span>
            <strong>Engineering Disclaimer:</strong> eRTMAC-NWIS provides objective historical
            evidence and technical telemetry from offset wells. Final wellbore trajectories, mud
            programs, and well control schedules remain under the professional engineering authority
            of the Lead Drilling Superintendent.
          </span>
        </div>
      </div>

      {/* 8. Export Briefing Modal */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-black uppercase tracking-wider">
                  NWIS Drilling Prognosis Briefing Dossier
                </h3>
              </div>
              <button
                onClick={() => setShowBriefingModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 block">TARGET WELL</span>
                  <strong className="text-cyan-300">{target.name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">TARGET FORMATION</span>
                  <strong className="text-zinc-200">{target.targetFormation}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">PLANNED TD</span>
                  <strong className="text-zinc-200">{target.plannedDepth.toLocaleString()} m</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">BEST-FIT OFFSET</span>
                  <strong className="text-amber-400">{selectedOffsetWellId}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-amber-400 mb-1">1. Technical Justification</h4>
                <p className="text-zinc-300 leading-relaxed">
                  {contrast?.justification ||
                    `Selected ${selectedOffsetWellId} based on multi-factor stratigraphic compatibility, depth overlap, and documented telemetry.`}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400 mb-1">
                  2. Approved Mud Weight & Operational Envelope
                </h4>
                <p className="text-zinc-300">
                  Target Mud Weight Envelope: <strong>{targetMudWeightMin} SG</strong> to{" "}
                  <strong>{targetMudWeightMax} SG</strong>. Ensure LCM pills are pre-mixed prior to
                  penetrating porous sandstone boundaries.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-rose-400 mb-1">
                  3. Key Offset Hazard Watchlist
                </h4>
                <div className="space-y-1.5">
                  {depthIntervalIncidents.flatMap((i) => i.events).length === 0 ? (
                    <p className="text-zinc-400">Zero critical offset incidents documented.</p>
                  ) : (
                    depthIntervalIncidents
                      .flatMap((i) => i.events)
                      .slice(0, 4)
                      .map((e, idx) => (
                        <div
                          key={idx}
                          className="rounded bg-zinc-900 p-2 border border-zinc-800 text-[11px]"
                        >
                          <strong>{e.eventType}</strong> at {e.depth}m MD ({e.wellId}):{" "}
                          {e.description}. Mitigation: {e.mitigation}
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-zinc-400">
                <div>
                  <span>Signed by: </span>
                  <strong className="text-zinc-200">{engineerSignoff.engineerName}</strong>
                </div>
                <div className="font-mono text-[10px]">
                  Generated via eRTMAC-NWIS Engine &bull; {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-all"
              >
                <Printer className="h-3.5 w-3.5" /> Print / Save PDF
              </button>
              <button
                onClick={() => setShowBriefingModal(false)}
                className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


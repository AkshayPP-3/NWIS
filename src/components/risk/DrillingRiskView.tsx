"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Sliders,
  Sparkles,
  Compass,
} from "lucide-react";
import type { Well, WellEvent, DrillingParameter, RiskIndicator, RiskCategory } from "@/types/well";
import { evaluateFieldRisks, SCIENTIFIC_DISCLAIMER } from "@/lib/riskEngine";

interface DrillingRiskViewProps {
  wells: Well[];
  selectedWell: Well | null;
  onSelectWell: (well: Well) => void;
}

export default function DrillingRiskView({
  wells,
  selectedWell,
  onSelectWell,
}: DrillingRiskViewProps) {
  const [events, setEvents] = useState<WellEvent[]>([]);
  const [parameters, setParameters] = useState<DrillingParameter[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [expandedRiskIds, setExpandedRiskIds] = useState<Record<string, boolean>>({
    "risk-barail-mudloss": true,
    "risk-calc-overpressure": true,
  });

  // Fetch events and parameters to feed risk engine
  useEffect(() => {
    Promise.all(
      wells.map((w) =>
        fetch(`/api/wells/${w.wellId}`).then((r) => r.json())
      )
    )
      .then((results) => {
        const evts: WellEvent[] = [];
        const params: DrillingParameter[] = [];
        results.forEach((data) => {
          if (data && !data.error) {
            if (data.events) evts.push(...data.events);
            if (data.parameters) params.push(...data.parameters);
          }
        });
        setEvents(evts);
        setParameters(params);
      })
      .catch((err) => console.error("Failed to load telemetry for risk engine:", err));
  }, [wells]);

  const riskIndicators = useMemo(() => {
    return evaluateFieldRisks(wells, events, parameters, selectedWell);
  }, [wells, events, parameters, selectedWell]);

  const filteredRisks = riskIndicators.filter((r) => {
    if (selectedCategory !== "ALL" && r.category !== selectedCategory) {
      return false;
    }
    if (selectedSeverity !== "ALL" && r.severity !== selectedSeverity) {
      return false;
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedRiskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 text-zinc-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-zinc-100">
              Drilling Risk & Decision-Support Intelligence
            </h2>
            <p className="text-xs text-zinc-400">
              Explainable hazard indicators, pore pressure gradients, and historical offset correlations
            </p>
          </div>
        </div>

        {/* Origin Target Indicator */}
        {selectedWell && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" />
            <span>Target Well Context: <strong>{selectedWell.wellId}</strong></span>
          </div>
        )}
      </div>

      {/* Mandatory Engineering Scientific Disclaimer Banner */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-extrabold text-amber-300 uppercase tracking-wider text-[11px] block mb-1">
            Engineering Decision-Support Disclaimer
          </span>
          <p>{SCIENTIFIC_DISCLAIMER}</p>
        </div>
      </div>

      {/* Filter Row: Categories & Severity */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-850 bg-zinc-900/60 p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
            Indicator Type:
          </span>
          {(
            [
              "ALL",
              "Historical Pattern",
              "Calculated Indicator",
              "AI Insight",
              "Potential Risk",
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded px-2.5 py-1 font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-amber-500 text-zinc-950 font-bold"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {cat === "ALL" ? "All Indicators" : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
            Severity:
          </span>
          {(["ALL", "Critical", "High", "Medium"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`rounded px-2 py-0.5 font-semibold transition-all ${
                selectedSeverity === sev
                  ? "bg-zinc-100 text-zinc-950 font-bold"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Indicators Feed */}
      <div className="space-y-4">
        {filteredRisks.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-12 text-center text-zinc-400">
            <ShieldAlert className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-zinc-200">No Indicators Match Filter</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Select &quot;All Indicators&quot; above to view field risk evaluations.
            </p>
          </div>
        ) : (
          filteredRisks.map((indicator) => {
            const isExpanded = !!expandedRiskIds[indicator.id];
            const isCritical = indicator.severity === "Critical";
            const isHigh = indicator.severity === "High";

            return (
              <div
                key={indicator.id}
                className={`rounded-xl border p-5 shadow-lg transition-all ${
                  isCritical
                    ? "border-rose-700/60 bg-rose-950/15"
                    : isHigh
                    ? "border-amber-700/60 bg-amber-950/10"
                    : "border-zinc-800 bg-zinc-950/80"
                }`}
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Explicit Classification Category Badge */}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          indicator.category === "Historical Pattern"
                            ? "bg-blue-900/60 text-blue-300 border border-blue-600/40"
                            : indicator.category === "Calculated Indicator"
                            ? "bg-amber-900/60 text-amber-300 border border-amber-600/40"
                            : indicator.category === "AI Insight"
                            ? "bg-violet-900/60 text-violet-300 border border-violet-600/40"
                            : "bg-rose-900/60 text-rose-300 border border-rose-600/40"
                        }`}
                      >
                        {indicator.category}
                      </span>

                      {/* Severity Badge */}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          isCritical
                            ? "bg-rose-600 text-white"
                            : isHigh
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        }`}
                      >
                        {indicator.severity} Severity
                      </span>

                      {indicator.formation && (
                        <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                          <Layers className="h-3 w-3 text-cyan-400" />
                          {indicator.formation}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold text-zinc-100">
                      {indicator.title}
                    </h3>
                  </div>

                  {indicator.depthInterval && (
                    <div className="font-mono text-xs font-bold text-amber-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                      Depth: {indicator.depthInterval.start}m – {indicator.depthInterval.end}m
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="mt-3 text-xs text-zinc-300 leading-relaxed">
                  {indicator.description}
                </p>

                {/* Recommended Mitigation */}
                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs">
                  <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider block mb-1">
                    Operational Recommendation:
                  </span>
                  <p className="text-zinc-200 italic">
                    {indicator.mitigationRecommendation}
                  </p>
                </div>

                {/* Explainable Evidence Section Toggle */}
                <div className="mt-4 pt-3 border-t border-zinc-850">
                  <button
                    onClick={() => toggleExpand(indicator.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-amber-400 transition-colors"
                  >
                    <FileCheck2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>
                      Explainable Technical Evidence ({indicator.evidence.length} facts)
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
                      {indicator.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs border-b border-zinc-800/50 pb-2 last:border-none last:pb-0"
                        >
                          <span className="font-mono font-bold text-amber-400 text-[11px] min-w-[20px]">
                            #{i + 1}
                          </span>
                          <div className="space-y-0.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {ev.sourceWellId && (
                                <span className="font-mono font-bold text-zinc-200">
                                  Source: {ev.sourceWellId}
                                </span>
                              )}
                              {ev.depthM && (
                                <span className="font-mono text-zinc-400 text-[11px]">
                                  Depth: {ev.depthM} m
                                </span>
                              )}
                              {ev.parameterName && (
                                <span className="font-mono text-cyan-400 text-[11px]">
                                  {ev.parameterName}: {ev.recordedValue}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400">{ev.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


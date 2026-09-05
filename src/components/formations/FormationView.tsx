"use client";

import React, { useMemo } from "react";
import {
  Layers,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  Ruler,
  Compass,
} from "lucide-react";
import type { Well, WellEvent } from "@/types/well";

interface FormationViewProps {
  wells: Well[];
  events: WellEvent[];
  onSelectFormation: (formation: string) => void;
  onSelectWell: (well: Well) => void;
}

interface FormationProfile {
  name: string;
  stratigraphicOrder: number; // 1 = shallow, 3 = deep
  lithologyDescription: string;
  typicalRisks: string[];
  recommendedMudType: string;
}

const FORMATION_PROFILES: Record<string, FormationProfile> = {
  "Tipam Formation": {
    name: "Tipam Formation",
    stratigraphicOrder: 1,
    lithologyDescription:
      "Coarse-grained massive sandstones intercalated with mottled claystones. Typically shallow to intermediate reservoir target.",
    typicalRisks: [
      "Differential sticking during connection breaks in permeable sands",
      "Minor washouts in loose unconsolidated top intervals",
    ],
    recommendedMudType: "Low-solids non-dispersed polymer mud (1.10 - 1.15 SG)",
  },
  "Barail Formation": {
    name: "Barail Formation",
    stratigraphicOrder: 2,
    lithologyDescription:
      "Alternating sequences of fine-to-medium sandstone, carbonaceous shales, and thin coal seams. Major hydrocarbon-bearing unit in Assam-Arakan Basin.",
    typicalRisks: [
      "Severe lost circulation in fractured sand intervals (1,900m – 2,150m)",
      "Coal seam sloughing and borehole enlargement",
    ],
    recommendedMudType: "Inhibited glycol/KCl polymer with LCM pill contingency (1.18 SG)",
  },
  "Disang Formation": {
    name: "Disang Formation",
    stratigraphicOrder: 3,
    lithologyDescription:
      "Deep marine dark grey to black splintery shales with tight siltstone laminations. Highly overpressured basement transition zone.",
    typicalRisks: [
      "Overpressured gas influx and kicks (>3,200 psi)",
      "Reactive shale swelling and tight hole on tripping",
    ],
    recommendedMudType: "High-density synthetic oil-based mud (SOBM) or weighted water-based mud (1.25 - 1.30 SG)",
  },
};

export default function FormationView({
  wells,
  events,
  onSelectFormation,
  onSelectWell,
}: FormationViewProps) {
  const formationGroups = useMemo(() => {
    const map = new Map<string, Well[]>();

    wells.forEach((w) => {
      const fmt = w.formation || "Unspecified Formation";
      const list = map.get(fmt) || [];
      list.push(w);
      map.set(fmt, list);
    });

    return Array.from(map.entries()).map(([formation, wellList]) => {
      const depths = wellList
        .map((w) => w.totalDepth)
        .filter((d): d is number => d !== null);

      const avgDepth =
        depths.length > 0
          ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length)
          : 0;
      const minDepth = depths.length > 0 ? Math.min(...depths) : 0;
      const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;

      // Associated events in these wells
      const wellIds = wellList.map((w) => w.id);
      const associatedEvents = events.filter((e) => wellIds.includes(e.wellId));

      const profile = FORMATION_PROFILES[formation] || {
        name: formation,
        stratigraphicOrder: 2,
        lithologyDescription: "Regional geological formation in the field.",
        typicalRisks: ["Monitor formation pressure and fluid losses"],
        recommendedMudType: "Conventional conditioned drilling fluid",
      };

      return {
        formation,
        wellList,
        avgDepth,
        minDepth,
        maxDepth,
        associatedEvents,
        profile,
      };
    });
  }, [wells, events]);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 text-zinc-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-zinc-100">
              Geological & Stratigraphic Formation Intelligence
            </h2>
            <p className="text-xs text-zinc-400">
              Stratigraphic distribution, formation-specific drilling risks, and well clustering
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-cyan-400 border border-cyan-500/30 bg-cyan-950/30 px-3 py-1.5 rounded-lg">
          <span>{formationGroups.length} Geological Formations Mapped</span>
        </div>
      </div>

      {/* Stratigraphic Formations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {formationGroups.map((group) => {
          const completedCount = group.wellList.filter(
            (w) => (w.status || "").toLowerCase() === "completed"
          ).length;
          const drillingCount = group.wellList.filter(
            (w) => (w.status || "").toLowerCase() === "drilling"
          ).length;
          const abandonedCount = group.wellList.filter(
            (w) => (w.status || "").toLowerCase() === "abandoned"
          ).length;

          return (
            <div
              key={group.formation}
              className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-xl transition-all hover:border-cyan-500/50"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-start justify-between border-b border-zinc-850 pb-3">
                  <div>
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 uppercase">
                      Stratigraphic Zone
                    </span>
                    <h3 className="mt-1 text-base font-extrabold text-zinc-100">
                      {group.formation}
                    </h3>
                  </div>

                  <span className="font-mono text-xs font-bold text-amber-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                    {group.wellList.length} Wells
                  </span>
                </div>

                {/* Lithological Description */}
                <p className="mt-3 text-xs text-zinc-300 leading-relaxed">
                  {group.profile.lithologyDescription}
                </p>

                {/* Depth Specs */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase">Min Depth</span>
                    <p className="font-mono font-bold text-zinc-200">{group.minDepth} m</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase">Avg Depth</span>
                    <p className="font-mono font-bold text-amber-400">{group.avgDepth} m</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase">Max Depth</span>
                    <p className="font-mono font-bold text-zinc-200">{group.maxDepth} m</p>
                  </div>
                </div>

                {/* Status Breakdown Pills */}
                <div className="mt-3 flex items-center gap-2 text-[11px]">
                  <span className="rounded bg-emerald-950 px-2 py-0.5 text-emerald-400 font-semibold">
                    {completedCount} Completed
                  </span>
                  {drillingCount > 0 && (
                    <span className="rounded bg-amber-950 px-2 py-0.5 text-amber-400 font-semibold animate-pulse">
                      {drillingCount} Drilling
                    </span>
                  )}
                  {abandonedCount > 0 && (
                    <span className="rounded bg-rose-950 px-2 py-0.5 text-rose-400 font-semibold">
                      {abandonedCount} Abandoned
                    </span>
                  )}
                </div>

                {/* Known Formation Drilling Hazards */}
                <div className="mt-4 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs">
                  <span className="font-bold text-amber-400 text-[10px] uppercase tracking-wider block mb-1">
                    Known Drilling Hazards in this Formation:
                  </span>
                  <ul className="space-y-1 text-[11px] text-zinc-300">
                    {group.profile.typicalRisks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400 mt-0.5" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Wells in this formation */}
                <div className="mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Wells Drilled in this Formation:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.wellList.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => onSelectWell(w)}
                        className="rounded-md border border-zinc-750 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
                      >
                        {w.wellId}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="mt-5 pt-3 border-t border-zinc-850">
                <button
                  onClick={() => onSelectFormation(group.formation)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/50 transition-all"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter Map by {group.formation}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


"use client";

import React from "react";
import {
  Layers,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ruler,
  Boxes,
} from "lucide-react";
import type { Well, WellEvent } from "@/types/well";

interface StatsBarProps {
  wells: Well[];
  events: WellEvent[];
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}

export default function StatsBar({
  wells,
  events,
  selectedStatus,
  onSelectStatus,
}: StatsBarProps) {
  const totalWells = wells.length;
  const drillingCount = wells.filter(
    (w) => (w.status || "").toLowerCase() === "drilling"
  ).length;
  const completedCount = wells.filter(
    (w) => (w.status || "").toLowerCase() === "completed"
  ).length;
  const abandonedCount = wells.filter(
    (w) => (w.status || "").toLowerCase() === "abandoned"
  ).length;

  const formations = Array.from(
    new Set(wells.map((w) => w.formation).filter(Boolean))
  );

  const highSeverityCount = events.filter((e) => e.severity === "High").length;

  const depths = wells.map((w) => w.totalDepth).filter((d): d is number => d !== null);
  const avgDepth =
    depths.length > 0
      ? Math.round(depths.reduce((acc, d) => acc + d, 0) / depths.length)
      : 0;

  const stats = [
    {
      id: "ALL",
      label: "Total Wells",
      value: totalWells,
      subtext: "Assam-Arakan Basin",
      icon: Boxes,
      color: "text-zinc-100",
      bgColor: "bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800",
      activeBorder: "ring-2 ring-amber-500",
    },
    {
      id: "Drilling",
      label: "Active Drilling",
      value: drillingCount,
      subtext: "Live Telemetry Rig",
      icon: Flame,
      color: "text-amber-400",
      bgColor: "bg-amber-950/20 hover:bg-amber-950/40 border-amber-800/30",
      activeBorder: "ring-2 ring-amber-400",
    },
    {
      id: "Completed",
      label: "Completed Wells",
      value: completedCount,
      subtext: "Production / Shut-in",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-800/30",
      activeBorder: "ring-2 ring-emerald-400",
    },
    {
      id: "Abandoned",
      label: "Abandoned Wells",
      value: abandonedCount,
      subtext: "Plugged & Abandoned",
      icon: XCircle,
      color: "text-rose-400",
      bgColor: "bg-rose-950/20 hover:bg-rose-950/40 border-rose-800/30",
      activeBorder: "ring-2 ring-rose-400",
    },
    {
      id: "formations",
      label: "Formations Mapped",
      value: formations.length,
      subtext: "Barail, Tipam, Disang",
      icon: Layers,
      color: "text-cyan-400",
      bgColor: "bg-cyan-950/20 hover:bg-cyan-950/40 border-cyan-800/30",
      isFilter: false,
    },
    {
      id: "events",
      label: "Field Incidents",
      value: events.length,
      subtext: `${highSeverityCount} Critical / High Severity`,
      icon: AlertTriangle,
      color: "text-amber-400",
      bgColor: "bg-amber-950/20 hover:bg-amber-950/40 border-amber-800/30",
      isFilter: false,
    },
    {
      id: "avgDepth",
      label: "Avg Total Depth",
      value: `${avgDepth.toLocaleString()} m`,
      subtext: "Depth Target Range",
      icon: Ruler,
      color: "text-indigo-400",
      bgColor: "bg-indigo-950/20 hover:bg-indigo-950/40 border-indigo-800/30",
      isFilter: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 sm:px-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isSelected = selectedStatus === stat.id;
        return (
          <button
            key={stat.label}
            onClick={() => {
              if (stat.isFilter !== false) {
                onSelectStatus(isSelected ? "ALL" : stat.id);
              }
            }}
            disabled={stat.isFilter === false}
            className={`group flex flex-col justify-between rounded-lg border p-3 text-left transition-all ${
              stat.bgColor
            } ${isSelected ? stat.activeBorder : ""} ${
              stat.isFilter === false ? "cursor-default" : "cursor-pointer"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200">
                {stat.label}
              </span>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="mt-2">
              <span className={`text-xl font-bold tracking-tight ${stat.color}`}>
                {stat.value}
              </span>
              <p className="mt-0.5 text-[10px] text-zinc-400 truncate">
                {stat.subtext}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}


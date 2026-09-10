"use client";

import React from "react";
import {
  Compass,
  Map as MapIcon,
  Navigation,
  GitCompare,
  Activity,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Bot,
  BarChart3,
  Database,
  Radio,
  Target,
} from "lucide-react";

export type ActiveTab =
  | "map"
  | "target"
  | "nearby"
  | "compare"
  | "drilling"
  | "events"
  | "formations"
  | "risks"
  | "ai"
  | "analytics";

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedWellId?: string | null;
  comparisonCount: number;
  totalWells: number;
}

export default function Header({
  activeTab,
  onTabChange,
  selectedWellId,
  comparisonCount,
  totalWells,
}: HeaderProps) {
  const tabs = [
    { id: "map" as ActiveTab, label: "GIS Map", icon: MapIcon },
    {
      id: "target" as ActiveTab,
      label: "Target Intelligence ⭐",
      icon: Target,
      badge: "SIH Flagship",
      highlight: true,
    },
    {
      id: "nearby" as ActiveTab,
      label: "Nearby Intelligence",
      icon: Navigation,
      badge: selectedWellId ? "Active" : undefined,
    },
    {
      id: "compare" as ActiveTab,
      label: "Well Comparison",
      icon: GitCompare,
      badge: comparisonCount > 0 ? String(comparisonCount) : undefined,
    },
    { id: "drilling" as ActiveTab, label: "Drilling Parameters", icon: Activity },
    { id: "events" as ActiveTab, label: "Well Events", icon: AlertTriangle },
    { id: "formations" as ActiveTab, label: "Geological Formations", icon: Layers },
    { id: "risks" as ActiveTab, label: "Risk Intelligence", icon: ShieldAlert },
    { id: "ai" as ActiveTab, label: "AI Assistant", icon: Bot },
    { id: "analytics" as ActiveTab, label: "Analytics", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
      {/* Top Banner: Branding & System Telemetry Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
            <Compass className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-wider text-zinc-100">
                NWIS
              </span>
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                SIH Edition
              </span>
            </div>
            <p className="text-xs font-medium text-zinc-400">
              Nearby Wells Intelligence System &bull; Autonomous Drilling Decision Support
            </p>
          </div>
        </div>

        {/* Telemetry Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <Database className="h-3.5 w-3.5" />
            <span className="font-semibold">Neon PostgreSQL Connected</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-400">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>WGS84 Geodesic Engine</span>
          </div>

          <div className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 font-mono text-zinc-300">
            {totalWells} Wells Monitored
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex overflow-x-auto border-t border-zinc-850 px-4 scrollbar-none sm:px-6">
        <nav className="flex space-x-1 py-1.5" aria-label="Dashboard views">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-amber-500 text-zinc-950 shadow-sm shadow-amber-500/20"
                    : tab.highlight
                    ? "bg-violet-950/40 text-violet-300 hover:bg-violet-900/50 hover:text-violet-100 border border-violet-700/40"
                    : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-zinc-950" : ""}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-zinc-950 text-amber-400"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}


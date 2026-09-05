"use client";

import React from "react";
import { Search, Filter, RotateCcw, SlidersHorizontal, MapPin } from "lucide-react";
import type { FilterState, Well } from "@/types/well";

interface WellSearchToolbarProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  availableFormations: string[];
  totalWellsCount: number;
  filteredWellsCount: number;
  selectedWell: Well | null;
  onClearFilters: () => void;
}

export default function WellSearchToolbar({
  filter,
  onFilterChange,
  availableFormations,
  totalWellsCount,
  filteredWellsCount,
  selectedWell,
  onClearFilters,
}: WellSearchToolbarProps) {
  const isFiltered =
    filter.searchQuery.trim() !== "" ||
    filter.status !== "ALL" ||
    filter.formation !== "ALL" ||
    filter.minDepth > 0 ||
    filter.maxDepth < 5000 ||
    filter.maxDistanceKm !== null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-sm backdrop-blur-md">
      {/* Search Input and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) =>
              onFilterChange({ ...filter, searchQuery: e.target.value })
            }
            placeholder="Search by Well ID (e.g. WELL-001) or Name..."
            className="w-full rounded-lg border border-zinc-750 bg-zinc-950 py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {filter.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filter, searchQuery: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono">
            Showing <strong className="text-amber-400">{filteredWellsCount}</strong> of{" "}
            {totalWellsCount} wells
          </span>

          {isFiltered && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700 hover:text-white transition-all"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Filter Row: Status, Formation, Depth, Offset Distance */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-800/60 text-xs">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 font-medium flex items-center gap-1">
            <Filter className="h-3 w-3 text-zinc-400" /> Status:
          </span>
          {(["ALL", "Completed", "Drilling", "Abandoned"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => onFilterChange({ ...filter, status })}
                className={`rounded-md px-2 py-1 font-medium transition-all ${
                  filter.status === status
                    ? "bg-zinc-100 text-zinc-900 font-bold"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                }`}
              >
                {status === "ALL" ? "All" : status}
              </button>
            )
          )}
        </div>

        {/* Formation Filter Dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 font-medium">Formation:</span>
          <select
            value={filter.formation}
            onChange={(e) =>
              onFilterChange({ ...filter, formation: e.target.value })
            }
            aria-label="Filter by geological formation"
            className="rounded-md border border-zinc-750 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">All Formations</option>
            {availableFormations.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt}
              </option>
            ))}
          </select>
        </div>

        {/* Depth Filter */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-medium flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3 text-zinc-400" /> Max Depth:
          </span>
          <input
            type="range"
            min={2000}
            max={4500}
            step={100}
            value={filter.maxDepth}
            onChange={(e) =>
              onFilterChange({ ...filter, maxDepth: parseInt(e.target.value, 10) })
            }
            aria-label="Filter by maximum depth"
            className="h-1.5 w-24 accent-amber-500 bg-zinc-700 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-zinc-300 min-w-[50px]">
            &le; {filter.maxDepth}m
          </span>
        </div>

        {/* Distance Filter (Active when a well is selected) */}
        {selectedWell && (
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-750">
            <span className="text-zinc-400 font-medium flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-400" /> Radius from {selectedWell.wellId}:
            </span>
            <select
              value={filter.maxDistanceKm ?? "ALL"}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  maxDistanceKm:
                    e.target.value === "ALL" ? null : parseFloat(e.target.value),
                })
              }
              aria-label="Filter by radius distance"
              className="rounded-md border border-amber-500/40 bg-zinc-950 px-2.5 py-1 text-xs text-amber-400 focus:outline-none"
            >
              <option value="ALL">All Distances</option>
              <option value="3">&le; 3.0 km (Immediate Offset)</option>
              <option value="5">&le; 5.0 km (Local Cluster)</option>
              <option value="10">&le; 10.0 km (Field Scale)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}


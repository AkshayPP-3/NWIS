"use client";

import React, { useEffect, useState, useMemo } from "react";
import Header, { type ActiveTab } from "@/components/dashboard/Header";
import StatsBar from "@/components/dashboard/StatsBar";
import WellsMap from "@/components/map/WellsMap";
import WellSearchToolbar from "@/components/wells/WellSearchToolbar";
import WellIntelligencePanel from "@/components/wells/WellIntelligencePanel";
import NearbyWellsView from "@/components/wells/NearbyWellsView";
import WellComparisonView from "@/components/wells/WellComparisonView";
import DrillingLogView from "@/components/drilling/DrillingLogView";
import WellEventsView from "@/components/events/WellEventsView";
import FormationView from "@/components/formations/FormationView";
import DrillingRiskView from "@/components/risk/DrillingRiskView";
import AIAssistantView from "@/components/ai/AIAssistantView";
import AnalyticsView from "@/components/analytics/AnalyticsView";
import TargetAnalysisView from "@/components/target/TargetAnalysisView";

import type { Well, WellEvent, TargetLocation, FilterState, TargetProfile } from "@/types/well";
import { evaluateTargetOffsetWells } from "@/lib/relevanceEngine";
import { calculateHaversineDistanceKm } from "@/lib/geo";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Home() {
  const [wells, setWells] = useState<Well[]>([]);
  const [events, setEvents] = useState<WellEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("map");

  // Selection state
  const [selectedWell, setSelectedWell] = useState<Well | null>(null);
  const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(null);
  const [targetProfile, setTargetProfile] = useState<TargetProfile>({
    name: "PROPOSED-EXPLORATION-01",
    latitude: 27.38,
    longitude: 95.63,
    targetFormation: "Barail Formation",
    plannedDepth: 3200,
    searchRadiusKm: 50,
  });
  const [comparisonWellIds, setComparisonWellIds] = useState<string[]>([
    "WELL-001",
    "WELL-002",
  ]);

  // AI assistant prompt passed from other views
  const [aiPrompt, setAiPrompt] = useState<string | undefined>(undefined);

  // Search & Filter state
  const [filter, setFilter] = useState<FilterState>({
    searchQuery: "",
    status: "ALL",
    formation: "ALL",
    minDepth: 0,
    maxDepth: 5000,
    maxDistanceKm: null,
  });

  // Fetch wells from the existing /api/wells route
  const fetchWellsData = () => {
    setLoading(true);
    setError(null);

    fetch("/api/wells")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setWells(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch wells:", err);
        setError("Unable to connect to database. Please check connection.");
        setLoading(false);
      });

    // Also fetch sample events for global KPI
    fetch("/api/wells/WELL-001")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.events) setEvents(d.events);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchWellsData();
  }, []);

  // Formations list
  const availableFormations = useMemo(() => {
    const set = new Set<string>();
    wells.forEach((w) => {
      if (w.formation) set.add(w.formation);
    });
    return Array.from(set);
  }, [wells]);

  // Dynamic filtering
  const filteredWells = useMemo(() => {
    return wells.filter((well) => {
      // Search query
      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase().trim();
        const matchesId = well.wellId.toLowerCase().includes(q);
        const matchesName = well.name.toLowerCase().includes(q);
        if (!matchesId && !matchesName) return false;
      }

      // Status
      if (filter.status !== "ALL") {
        if (
          (well.status || "").toLowerCase() !== filter.status.toLowerCase()
        ) {
          return false;
        }
      }

      // Formation
      if (filter.formation !== "ALL") {
        if (well.formation !== filter.formation) return false;
      }

      // Depth
      if (well.totalDepth && well.totalDepth > filter.maxDepth) {
        return false;
      }

      // Distance from selected well
      if (filter.maxDistanceKm !== null && selectedWell) {
        const dist = calculateHaversineDistanceKm(
          selectedWell.latitude,
          selectedWell.longitude,
          well.latitude,
          well.longitude
        );
        if (dist > filter.maxDistanceKm) return false;
      }

      return true;
    });
  }, [wells, filter, selectedWell]);

  // Comparison toggle
  const handleToggleCompare = (wellId: string) => {
    setComparisonWellIds((prev) => {
      if (prev.includes(wellId)) {
        return prev.filter((id) => id !== wellId);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), wellId];
      }
      return [...prev, wellId];
    });
  };

  const handleClearComparison = () => {
    setComparisonWellIds([]);
  };

  // Cross-view navigation handlers
  const handleViewNearby = (well: Well) => {
    setSelectedWell(well);
    setActiveTab("nearby");
  };

  const handleViewDrilling = (well: Well) => {
    setSelectedWell(well);
    setActiveTab("drilling");
  };

  const handleViewEvents = (well: Well) => {
    setSelectedWell(well);
    setActiveTab("events");
  };

  const handleAskAI = (prompt: string) => {
    setAiPrompt(prompt);
    setActiveTab("ai");
  };

  const handleSelectFormationFilter = (formation: string) => {
    setFilter((prev) => ({ ...prev, formation }));
    setActiveTab("map");
  };

  // Synchronized target location setter from map or presets
  const handleSetTargetLocation = (loc: TargetLocation | null) => {
    setTargetLocation(loc);
    if (loc) {
      setTargetProfile((prev) => ({
        ...prev,
        latitude: loc.latitude,
        longitude: loc.longitude,
      }));
    }
  };

  // Evaluate candidate offset wells for map highlighting
  const targetEvaluation = useMemo(() => {
    return evaluateTargetOffsetWells(targetProfile, wells);
  }, [targetProfile, wells]);

  const bestFitWellId = targetEvaluation.bestFitWell?.well.wellId || null;
  const candidateWellIds = useMemo(
    () => targetEvaluation.topCandidates.map((c) => c.well.wellId),
    [targetEvaluation]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* 1. Header with System Telemetry and View Tabs */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setAiPrompt(undefined);
        }}
        selectedWellId={selectedWell?.wellId}
        comparisonCount={comparisonWellIds.length}
        totalWells={wells.length}
      />

      {/* 2. Top Stats KPI Counters Bar */}
      <StatsBar
        wells={wells}
        events={events}
        selectedStatus={filter.status}
        onSelectStatus={(status) => setFilter({ ...filter, status })}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 pb-10">
        {/* Loading State */}
        {loading && (
          <div className="p-6">
            <div className="h-150 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse flex items-center justify-center">
              <span className="text-sm font-mono text-zinc-400">
                Loading NWIS Telemetry & Geospatial Maps...
              </span>
            </div>
          </div>
        )}

        {/* Error State with Retry Button */}
        {error && (
          <div className="p-6">
            <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-8 text-center text-rose-300">
              <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
              <h3 className="text-base font-bold">Failed to load well telemetry</h3>
              <p className="text-xs text-rose-400 mt-1 max-w-md mx-auto">{error}</p>
              <button
                onClick={fetchWellsData}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* VIEW 1: GIS Map & Search */}
            {activeTab === "map" && (
              <div className="flex flex-col gap-4 px-4 sm:px-6">
                {/* Search & Filter Toolbar */}
                <WellSearchToolbar
                  filter={filter}
                  onFilterChange={setFilter}
                  availableFormations={availableFormations}
                  totalWellsCount={wells.length}
                  filteredWellsCount={filteredWells.length}
                  selectedWell={selectedWell}
                  onClearFilters={() =>
                    setFilter({
                      searchQuery: "",
                      status: "ALL",
                      formation: "ALL",
                      minDepth: 0,
                      maxDepth: 5000,
                      maxDistanceKm: null,
                    })
                  }
                />

                {/* Map & Well Intelligence Panel Grid */}
                <div
                  className={`grid grid-cols-1 gap-4 transition-all ${
                    selectedWell ? "lg:grid-cols-3" : "grid-cols-1"
                  }`}
                >
                  <div
                    className={selectedWell ? "lg:col-span-2" : "col-span-1"}
                  >
                    <WellsMap
                      wells={filteredWells}
                      selectedWell={selectedWell}
                      onSelectWell={(well) => setSelectedWell(well)}
                      targetLocation={targetLocation}
                      onSetTargetLocation={handleSetTargetLocation}
                      comparisonWellIds={comparisonWellIds}
                      onToggleCompare={handleToggleCompare}
                      bestFitWellId={bestFitWellId}
                      candidateWellIds={candidateWellIds}
                      searchRadiusKm={targetProfile.searchRadiusKm}
                      onNavigateToTargetAnalysis={() => setActiveTab("target")}
                    />
                  </div>

                  {/* Well Intelligence Panel (Rendered when a well is selected) */}
                  {selectedWell && (
                    <div className="h-162.5 lg:col-span-1">
                      <WellIntelligencePanel
                        well={selectedWell}
                        onClose={() => setSelectedWell(null)}
                        onViewNearby={handleViewNearby}
                        onViewDrilling={handleViewDrilling}
                        onViewEvents={handleViewEvents}
                        onAskAI={handleAskAI}
                        onToggleCompare={handleToggleCompare}
                        isCompared={comparisonWellIds.includes(
                          selectedWell.wellId
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 0 / FLAGSHIP: Target Intelligence & Best-Fit Offset Selection */}
            {activeTab === "target" && (
              <TargetAnalysisView
                wells={wells}
                initialTarget={targetProfile}
                onTargetChange={(t) => {
                  setTargetProfile(t);
                  setTargetLocation({ latitude: t.latitude, longitude: t.longitude });
                }}
                onSelectWellOnMap={(well) => {
                  setSelectedWell(well);
                  setActiveTab("map");
                }}
                onNavigateToComparison={(ids) => {
                  setComparisonWellIds(ids);
                  setActiveTab("compare");
                }}
              />
            )}

            {/* VIEW 2: Nearby Wells Intelligence */}
            {activeTab === "nearby" && (
              <NearbyWellsView
                wells={wells}
                selectedWell={selectedWell}
                targetLocation={targetLocation}
                onSelectWell={(well) => {
                  setSelectedWell(well);
                  setActiveTab("map");
                }}
                onToggleCompare={handleToggleCompare}
                comparisonWellIds={comparisonWellIds}
              />
            )}

            {/* VIEW 3: Well Comparison */}
            {activeTab === "compare" && (
              <WellComparisonView
                wells={wells}
                comparisonWellIds={comparisonWellIds}
                onToggleCompare={handleToggleCompare}
                onClearComparison={handleClearComparison}
                onSelectWell={(well) => {
                  setSelectedWell(well);
                  setActiveTab("map");
                }}
              />
            )}

            {/* VIEW 4: Drilling Parameters Multi-Track Depth Log */}
            {activeTab === "drilling" && (
              <DrillingLogView
                wells={wells}
                selectedWell={selectedWell}
                onSelectWell={(well) => setSelectedWell(well)}
              />
            )}

            {/* VIEW 5: Well Events / Incident Timeline */}
            {activeTab === "events" && (
              <WellEventsView
                wells={wells}
                selectedWell={selectedWell}
                onSelectWell={(well) => setSelectedWell(well)}
              />
            )}

            {/* VIEW 6: Geological Formations */}
            {activeTab === "formations" && (
              <FormationView
                wells={wells}
                events={events}
                onSelectFormation={handleSelectFormationFilter}
                onSelectWell={(well) => {
                  setSelectedWell(well);
                  setActiveTab("map");
                }}
              />
            )}

            {/* VIEW 7: Drilling Risk Intelligence */}
            {activeTab === "risks" && (
              <DrillingRiskView
                wells={wells}
                selectedWell={selectedWell}
                onSelectWell={(well) => setSelectedWell(well)}
              />
            )}

            {/* VIEW 8: NWIS AI Drilling Assistant */}
            {activeTab === "ai" && (
              <AIAssistantView
                wells={wells}
                selectedWell={selectedWell}
                onNavigateToWell={(well) => {
                  setSelectedWell(well);
                  setActiveTab("map");
                }}
                onNavigateToCompare={(ids) => {
                  setComparisonWellIds(ids);
                  setActiveTab("compare");
                }}
                onNavigateToNearby={(well) => {
                  setSelectedWell(well);
                  setActiveTab("nearby");
                }}
                initialPrompt={aiPrompt}
              />
            )}

            {/* VIEW 9: Analytics Dashboard */}
            {activeTab === "analytics" && (
              <AnalyticsView wells={wells} events={events} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Maximize2,
  Crosshair,
  Layers,
  Target,
  Sparkles,
} from "lucide-react";
import type { Well, TargetLocation } from "@/types/well";
import { calculateHaversineDistanceKm, calculateBounds } from "@/lib/geo";

export interface WellsMapProps {
  wells: Well[];
  selectedWell: Well | null;
  onSelectWell: (well: Well | null) => void;
  targetLocation: TargetLocation | null;
  onSetTargetLocation: (loc: TargetLocation | null) => void;
  comparisonWellIds: string[];
  onToggleCompare?: (wellId: string) => void;
  bestFitWellId?: string | null;
  candidateWellIds?: string[];
  searchRadiusKm?: number;
  onNavigateToTargetAnalysis?: () => void;
}

// Inner helper component to handle map clicks and bounds fitting
function MapController({
  onSetTargetLocation,
  wells,
  fitTrigger,
}: {
  onSetTargetLocation: (loc: TargetLocation | null) => void;
  wells: Well[];
  fitTrigger: number;
}) {
  const map = useMap();

  // Listen for clicks on the map surface to set a new drill target site
  useMapEvents({
    click(e) {
      console.log("LEAFLET NEW DRILL TARGET:", e.latlng.lat, e.latlng.lng);
      onSetTargetLocation({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
        label: "Proposed Drill Site",
      });
    },
  });

  // Fit bounds when fitTrigger changes
  React.useEffect(() => {
    if (fitTrigger === 0 || wells.length === 0) return;
    const bounds = calculateBounds(wells);
    if (!bounds) return;

    map.flyToBounds(
      [
        [bounds.minLat - 0.05, bounds.minLng - 0.05],
        [bounds.maxLat + 0.05, bounds.maxLng + 0.05],
      ],
      { duration: 1.2, padding: [40, 40] }
    );
  }, [fitTrigger, map, wells]);

  return null;
}

// Factory function to create custom Leaflet DivIcons with status symbology & Best-Fit highlighting
function createWellDivIcon(
  well: Well,
  isSelected: boolean,
  isCompared: boolean,
  distanceFromRef: number | null,
  isBestFit: boolean = false,
  isCandidate: boolean = false
): L.DivIcon {
  const status = (well.status || "").toLowerCase();

  let markerHtml = "";

  if (isBestFit) {
    // ⭐ BEST-FIT OFFSET WELL - Prominent Gold Star with radar ring
    markerHtml = `
      <div class="relative flex flex-col items-center select-none cursor-pointer z-50">
        <span class="absolute -inset-2.5 animate-ping rounded-full bg-amber-400 opacity-75"></span>
        <div class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-500 text-zinc-950 shadow-2xl shadow-amber-500/80 scale-115">
          <span class="text-sm font-black">⭐</span>
        </div>
        <div class="mt-1 rounded bg-amber-500 px-2 py-0.5 text-center font-mono text-[9px] font-black tracking-tight text-zinc-950 shadow-md border border-amber-300">
          #1 BEST-FIT &bull; ${well.wellId}
          ${distanceFromRef !== null ? `<span class="block text-[8px] font-extrabold text-zinc-900">${distanceFromRef}km</span>` : ""}
        </div>
      </div>
    `;
  } else if (isCandidate) {
    // Secondary / Tertiary Candidate Well - Indigo accent badge
    markerHtml = `
      <div class="relative flex flex-col items-center select-none cursor-pointer">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-indigo-400 bg-indigo-950 text-indigo-300 shadow-lg">
          <svg class="h-4 w-4 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="mt-1 rounded bg-indigo-600 px-1.5 py-0.5 text-center font-mono text-[9px] font-extrabold tracking-tight text-white shadow-sm border border-indigo-400">
          ${well.wellId}
          ${distanceFromRef !== null ? `<span class="block text-[8px] font-normal text-indigo-200">${distanceFromRef}km</span>` : ""}
        </div>
      </div>
    `;
  } else if (status === "drilling") {
    // Active Drilling Rig - Pulsing radar amber ring
    markerHtml = `
      <div class="relative flex flex-col items-center select-none cursor-pointer">
        <div class="relative flex items-center justify-center">
          <span class="absolute -inset-2 animate-ping rounded-full bg-amber-400 opacity-60"></span>
          <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            isSelected
              ? "border-white bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/50 scale-110"
              : "border-amber-400 bg-amber-950 text-amber-300 shadow-md"
          }">
            <svg class="h-4 w-4 animate-pulse fill-current" viewBox="0 0 24 24">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
        </div>
        <div class="mt-1 rounded px-1.5 py-0.5 text-center font-mono text-[9px] font-extrabold tracking-tight ${
          isSelected
            ? "bg-amber-400 text-zinc-950 shadow-sm"
            : isCompared
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-zinc-950/90 text-zinc-200 border border-zinc-700"
        }">
          ${well.wellId}
          ${distanceFromRef !== null ? `<span class="block text-[8px] font-normal text-amber-300">${distanceFromRef}km</span>` : ""}
        </div>
      </div>
    `;
  } else if (status === "abandoned") {
    // Abandoned Well - Muted ruby rotated diamond
    markerHtml = `
      <div class="relative flex flex-col items-center select-none cursor-pointer">
        <div class="flex h-7 w-7 rotate-45 items-center justify-center border-2 ${
          isSelected
            ? "border-white bg-rose-600 text-white shadow-lg scale-110"
            : "border-rose-400/80 bg-zinc-900 text-rose-400 shadow-md"
        }">
          <span class="-rotate-45 font-bold text-xs">✕</span>
        </div>
        <div class="mt-1.5 rounded px-1.5 py-0.5 text-center font-mono text-[9px] font-extrabold tracking-tight ${
          isSelected
            ? "bg-amber-400 text-zinc-950 shadow-sm"
            : isCompared
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-zinc-950/90 text-zinc-200 border border-zinc-700"
        }">
          ${well.wellId}
          ${distanceFromRef !== null ? `<span class="block text-[8px] font-normal text-amber-300">${distanceFromRef}km</span>` : ""}
        </div>
      </div>
    `;
  } else {
    // Completed Production Well - Emerald hex badge
    markerHtml = `
      <div class="relative flex flex-col items-center select-none cursor-pointer">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg border-2 ${
          isSelected
            ? "border-white bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/40 scale-110"
            : "border-emerald-400/80 bg-zinc-900 text-emerald-400 shadow-md"
        }">
          <svg class="h-3.5 w-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="mt-1 rounded px-1.5 py-0.5 text-center font-mono text-[9px] font-extrabold tracking-tight ${
          isSelected
            ? "bg-amber-400 text-zinc-950 shadow-sm"
            : isCompared
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-zinc-950/90 text-zinc-200 border border-zinc-700"
        }">
          ${well.wellId}
          ${distanceFromRef !== null ? `<span class="block text-[8px] font-normal text-amber-300">${distanceFromRef}km</span>` : ""}
        </div>
      </div>
    `;
  }

  return L.divIcon({
    html: markerHtml,
    className: "nwis-leaflet-well-marker",
    iconSize: [44, 48],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
}

function createTargetDivIcon(): L.DivIcon {
  const html = `
    <div class="relative flex flex-col items-center select-none cursor-pointer">
      <span class="absolute -inset-3 animate-ping rounded-full bg-cyan-400 opacity-40"></span>
      <div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-cyan-300 bg-cyan-950/90 text-cyan-300 shadow-xl shadow-cyan-500/50">
        <svg class="h-5 w-5 animate-spin stroke-current fill-none stroke-2" viewBox="0 0 24 24" style="animation-duration: 8s;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="22" y1="12" x2="18" y2="12"></line>
          <line x1="6" y1="12" x2="2" y2="12"></line>
          <line x1="12" y1="6" x2="12" y2="2"></line>
          <line x1="12" y1="22" x2="12" y2="18"></line>
        </svg>
      </div>
      <div class="mt-1 whitespace-nowrap rounded bg-cyan-900/90 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-200 border border-cyan-600">
        TARGET SITE
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "nwis-leaflet-target-marker",
    iconSize: [44, 48],
    iconAnchor: [22, 24],
  });
}

export default function LeafletMap({
  wells,
  selectedWell,
  onSelectWell,
  targetLocation,
  onSetTargetLocation,
  comparisonWellIds,
  onToggleCompare,
  bestFitWellId,
  candidateWellIds = [],
  searchRadiusKm = 50,
  onNavigateToTargetAnalysis,
}: WellsMapProps) {
  const [fitTrigger, setFitTrigger] = useState<number>(1);

  // Initial center: India (Pan-India Sedimentary Basins)
  const initialCenter: [number, number] = [21.5, 82.5];
  const initialZoom = 5;

  const targetIcon = useMemo(() => createTargetDivIcon(), []);

  return (
    <div className="relative h-[650px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={true}
        className="h-full w-full bg-zinc-950"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <MapController
          onSetTargetLocation={onSetTargetLocation}
          wells={wells}
          fitTrigger={fitTrigger}
        />

        {/* Search Radius Circle when Target is Set */}
        {targetLocation && (
          <Circle
            center={[targetLocation.latitude, targetLocation.longitude]}
            radius={searchRadiusKm * 1000}
            pathOptions={{
              color: "#06b6d4",
              fillColor: "#06b6d4",
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: "5, 5",
            }}
          />
        )}

        {/* Wells Markers */}
        {wells.map((well) => {
          const isSelected = selectedWell?.id === well.id;
          const isCompared = comparisonWellIds.includes(well.wellId);
          const isBestFit = well.wellId === bestFitWellId;
          const isCandidate = !isBestFit && candidateWellIds.includes(well.wellId);

          let distanceFromRef: number | null = null;
          if (selectedWell && selectedWell.id !== well.id) {
            distanceFromRef = calculateHaversineDistanceKm(
              selectedWell.latitude,
              selectedWell.longitude,
              well.latitude,
              well.longitude
            );
          } else if (targetLocation) {
            distanceFromRef = calculateHaversineDistanceKm(
              targetLocation.latitude,
              targetLocation.longitude,
              well.latitude,
              well.longitude
            );
          }

          const icon = createWellDivIcon(
            well,
            isSelected,
            isCompared,
            distanceFromRef,
            isBestFit,
            isCandidate
          );

          return (
            <Marker
              key={well.id}
              position={[well.latitude, well.longitude]}
              icon={icon}
              zIndexOffset={isBestFit ? 1200 : isSelected ? 1000 : isCandidate ? 500 : 100}
              eventHandlers={{
                click: () => {
                  onSelectWell(isSelected ? null : well);
                },
              }}
            >
              {/* Hover Tooltip */}
              <Tooltip direction="top" offset={[0, -32]} opacity={1}>
                <div className="rounded-lg bg-zinc-950 p-2.5 text-zinc-100 shadow-2xl border border-zinc-750 font-sans text-xs min-w-[190px]">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-1">
                    <span className="font-extrabold text-amber-400 font-mono flex items-center gap-1">
                      {isBestFit && "⭐ "}
                      {well.wellId}
                    </span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300 uppercase">
                      {isBestFit ? "Best-Fit Offset" : well.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-zinc-300 truncate max-w-[180px]">
                    {well.name}
                  </p>
                  <div className="mt-1.5 space-y-0.5 text-[10px] text-zinc-400">
                    <p>
                      <strong>Formation:</strong>{" "}
                      <span className="text-zinc-200">
                        {well.formation || "N/A"}
                      </span>
                    </p>
                    <p>
                      <strong>Total Depth:</strong>{" "}
                      <span className="text-zinc-200 font-mono">
                        {well.totalDepth
                          ? `${well.totalDepth.toLocaleString()} m`
                          : "N/A"}
                      </span>
                    </p>
                    <p>
                      <strong>Coordinates:</strong>{" "}
                      <span className="font-mono text-zinc-300">
                        {well.latitude.toFixed(4)}°N, {well.longitude.toFixed(4)}°E
                      </span>
                    </p>
                    {distanceFromRef !== null && (
                      <p className="text-amber-400 font-semibold pt-0.5 border-t border-zinc-800/80">
                        Offset Distance: {distanceFromRef} km
                      </p>
                    )}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* User-placed Drill Target Marker */}
        {targetLocation && (
          <Marker
            position={[targetLocation.latitude, targetLocation.longitude]}
            icon={targetIcon}
            zIndexOffset={1500}
            eventHandlers={{
              click: () => onSetTargetLocation(null),
            }}
          >
            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
              <div className="rounded bg-cyan-950 p-2 text-cyan-200 border border-cyan-600 font-mono text-xs">
                <strong>PROPOSED DRILL SITE</strong>
                <p className="text-[10px] text-zinc-300">
                  {targetLocation.latitude.toFixed(4)}°N, {targetLocation.longitude.toFixed(4)}°E
                </p>
                <p className="text-[9px] text-cyan-400 mt-1">Click to remove</p>
              </div>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {/* Floating HUD Controls (Top-Left) */}
      <div className="absolute left-4 top-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setFitTrigger((prev) => prev + 1)}
          title="Fit view to all wells"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-xs font-semibold text-zinc-200 shadow-lg backdrop-blur-md hover:bg-zinc-800 hover:text-white transition-all"
        >
          <Maximize2 className="h-3.5 w-3.5 text-amber-400" />
          <span>Fit to Wells</span>
        </button>

        {onNavigateToTargetAnalysis && (
          <button
            onClick={onNavigateToTargetAnalysis}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-lg backdrop-blur-md hover:bg-amber-500 hover:text-zinc-950 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Target Analysis ⭐</span>
          </button>
        )}

        {targetLocation && (
          <button
            onClick={() => onSetTargetLocation(null)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-600 bg-cyan-950/90 px-3 py-1.5 text-xs font-semibold text-cyan-300 shadow-lg backdrop-blur-md hover:bg-cyan-900 transition-all"
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span>Clear Target Site</span>
          </button>
        )}
      </div>

      {/* Map Legend (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 shadow-2xl backdrop-blur-md text-xs text-zinc-300 max-w-[270px]">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
          <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 flex items-center gap-1">
            <Layers className="h-3 w-3 text-amber-400" /> Leaflet GIS Legend
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {wells.length} wells
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-zinc-950 shadow-sm shadow-amber-400">
              ⭐
            </span>
            <span className="font-semibold text-amber-300">#1 Best-Fit Offset Well</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-indigo-600 border border-indigo-400"></span>
            <span className="font-medium text-indigo-300">Top Candidate Offset</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400"></span>
            <span className="font-medium">Active Drilling Rig</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-sm bg-emerald-500"></span>
            <span className="font-medium">Completed Well</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rotate-45 bg-rose-500"></span>
            <span className="font-medium">Abandoned Well</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full border-2 border-cyan-400 bg-cyan-950"></span>
            <span className="font-medium text-cyan-300">Click Map: Set Target</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-zinc-800 text-[10px] text-zinc-400 leading-tight">
          💡 Click any marker to open <strong>Well Intelligence Panel</strong>.
        </div>
      </div>

      {/* Target Location Offset Callout (Bottom-Right) */}
      {targetLocation && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-xl border border-cyan-500/40 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md max-w-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <Crosshair className="h-4 w-4 animate-spin" />
              <span className="font-bold text-xs">Proposed Drill Target</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-300">
              {targetLocation.latitude.toFixed(4)}°N, {targetLocation.longitude.toFixed(4)}°E
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            Nearby offset analysis active. Search radius circle rendered.
          </p>
          {onNavigateToTargetAnalysis && (
            <button
              onClick={onNavigateToTargetAnalysis}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-cyan-400 shadow-md transition-all cursor-pointer"
            >
              <Target className="h-3.5 w-3.5" />
              Analyze Target & 3 Offset Wells ⭐
            </button>
          )}
        </div>
      )}
    </div>
  );
}


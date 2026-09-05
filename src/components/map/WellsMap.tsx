"use client";

import React, { useState, useRef, useMemo } from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Flame,
  CheckCircle2,
  XCircle,
  Crosshair,
  Maximize2,
  Layers,
  Info,
  GitCompare,
  Compass,
} from "lucide-react";
import type { Well, TargetLocation } from "@/types/well";
import { calculateHaversineDistanceKm, calculateBounds } from "@/lib/geo";

interface WellsMapProps {
  wells: Well[];
  selectedWell: Well | null;
  onSelectWell: (well: Well | null) => void;
  targetLocation: TargetLocation | null;
  onSetTargetLocation: (loc: TargetLocation | null) => void;
  comparisonWellIds: string[];
  onToggleCompare?: (wellId: string) => void;
}

export default function WellsMap({
  wells,
  selectedWell,
  onSelectWell,
  targetLocation,
  onSetTargetLocation,
  comparisonWellIds,
  onToggleCompare,
}: WellsMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [hoveredWell, setHoveredWell] = useState<Well | null>(null);
  const [mapStyle, setMapStyle] = useState<string>(
    "https://tiles.openfreemap.org/styles/liberty"
  );
  const [showRadius, setShowRadius] = useState<boolean>(true);

  // Fit map to show all current wells
  const handleFitToWells = () => {
    if (!mapRef.current || wells.length === 0) return;
    const bounds = calculateBounds(wells);
    if (!bounds) return;

    mapRef.current.fitBounds(
      [
        [bounds.minLng - 0.04, bounds.minLat - 0.04],
        [bounds.maxLng + 0.04, bounds.maxLat + 0.04],
      ],
      { duration: 1200, padding: 40 }
    );
  };

  // Center coordinate for radius rings
  const radiusCenter = useMemo(() => {
    if (selectedWell) {
      return { lat: selectedWell.latitude, lng: selectedWell.longitude };
    }
    if (targetLocation) {
      return { lat: targetLocation.latitude, lng: targetLocation.longitude };
    }
    return null;
  }, [selectedWell, targetLocation]);

  return (
    <div className="relative h-[650px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 94.91,
          latitude: 27.47,
          zoom: 11.2,
        }}
        mapStyle={mapStyle}
        onClick={(event) => {
          const { lng, lat } = event.lngLat;
          console.log("NEW DRILL TARGET:", lat, lng);
          onSetTargetLocation({
            latitude: lat,
            longitude: lng,
            label: "Proposed Drill Site",
          });
        }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {/* Existing Wells Markers with Status Distinctive Symbology */}
        {wells.map((well) => {
          const isSelected = selectedWell?.id === well.id;
          const isCompared = comparisonWellIds.includes(well.wellId);
          const status = (well.status || "").toLowerCase();

          // Distance from active reference (selected well or target location)
          let distanceFromRef: number | null = null;
          if (
            selectedWell &&
            selectedWell.id !== well.id
          ) {
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

          return (
            <Marker
              key={well.id}
              longitude={well.longitude}
              latitude={well.latitude}
              anchor="bottom"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("CLICKED WELL:", well.wellId);
                  onSelectWell(isSelected ? null : well);
                }}
                onMouseEnter={() => setHoveredWell(well)}
                onMouseLeave={() => setHoveredWell(null)}
                className="group relative cursor-pointer select-none transition-transform hover:scale-125"
                style={{ zIndex: isSelected ? 30 : 10 }}
              >
                {/* Visual Marker Pin Based on Status */}
                {status === "drilling" ? (
                  // Active Drilling Rig - Pulsing Radar
                  <div className="relative flex items-center justify-center">
                    <span className="absolute -inset-2 animate-ping rounded-full bg-amber-400 opacity-60"></span>
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? "border-white bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/50 scale-110"
                          : "border-amber-400 bg-amber-950 text-amber-300 shadow-md"
                      }`}
                    >
                      <Flame className="h-5 w-5 animate-pulse" />
                    </div>
                  </div>
                ) : status === "abandoned" ? (
                  // Abandoned Well - Muted Ruby Diamond
                  <div
                    className={`flex h-8 w-8 rotate-45 items-center justify-center border-2 ${
                      isSelected
                        ? "border-white bg-rose-600 text-white shadow-lg scale-110"
                        : "border-rose-400/80 bg-zinc-900 text-rose-400 shadow-md"
                    }`}
                  >
                    <XCircle className="h-4 w-4 -rotate-45" />
                  </div>
                ) : (
                  // Completed Production Well - Emerald Hex Badge
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 ${
                      isSelected
                        ? "border-white bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/40 scale-110"
                        : "border-emerald-400/80 bg-zinc-900 text-emerald-400 shadow-md"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}

                {/* Well ID Badge Label Underneath */}
                <div
                  className={`mt-1 rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-extrabold tracking-tight transition-all ${
                    isSelected
                      ? "bg-amber-400 text-zinc-950 shadow-sm"
                      : isCompared
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-zinc-950/90 text-zinc-200 border border-zinc-700"
                  }`}
                >
                  {well.wellId}
                  {distanceFromRef !== null && (
                    <span className="block text-[8px] font-normal text-amber-300">
                      {distanceFromRef}km
                    </span>
                  )}
                </div>
              </div>
            </Marker>
          );
        })}

        {/* User-placed Drill Target Marker */}
        {targetLocation && (
          <Marker
            longitude={targetLocation.longitude}
            latitude={targetLocation.latitude}
            anchor="center"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSetTargetLocation(null);
              }}
              title="Proposed Drill Site (Click to remove)"
              className="relative flex cursor-pointer items-center justify-center select-none"
            >
              <span className="absolute -inset-3 animate-ping rounded-full bg-cyan-400 opacity-40"></span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cyan-300 bg-cyan-950/90 text-cyan-300 shadow-xl shadow-cyan-500/50">
                <Crosshair className="h-6 w-6 animate-spin" style={{ animationDuration: "12s" }} />
              </div>
              <div className="absolute top-11 whitespace-nowrap rounded bg-cyan-900/90 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-200 border border-cyan-600">
                TARGET SITE
              </div>
            </div>
          </Marker>
        )}

        {/* Hover Tooltip */}
        {hoveredWell && !selectedWell && (
          <Popup
            longitude={hoveredWell.longitude}
            latitude={hoveredWell.latitude}
            offset={[0, -40]}
            closeButton={false}
            closeOnClick={false}
            className="z-50"
          >
            <div className="rounded-md bg-zinc-950 p-2.5 text-zinc-100 shadow-xl border border-zinc-800 font-sans text-xs">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-1">
                <span className="font-extrabold text-amber-400 font-mono">
                  {hoveredWell.wellId}
                </span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300 uppercase">
                  {hoveredWell.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-zinc-300 truncate max-w-[180px]">
                {hoveredWell.name}
              </p>
              <div className="mt-1.5 space-y-0.5 text-[10px] text-zinc-400">
                <p>
                  <strong>Formation:</strong>{" "}
                  <span className="text-zinc-200">
                    {hoveredWell.formation || "N/A"}
                  </span>
                </p>
                <p>
                  <strong>Total Depth:</strong>{" "}
                  <span className="text-zinc-200">
                    {hoveredWell.totalDepth
                      ? `${hoveredWell.totalDepth.toLocaleString()} m`
                      : "N/A"}
                  </span>
                </p>
                <p>
                  <strong>Coordinates:</strong>{" "}
                  <span className="font-mono text-zinc-300">
                    {hoveredWell.latitude.toFixed(4)}°N,{" "}
                    {hoveredWell.longitude.toFixed(4)}°E
                  </span>
                </p>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Map Floating HUD Controls (Top-Left) */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleFitToWells}
          title="Fit view to all wells"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-xs font-semibold text-zinc-200 shadow-lg backdrop-blur-md hover:bg-zinc-800 hover:text-white transition-all"
        >
          <Maximize2 className="h-3.5 w-3.5 text-amber-400" />
          <span>Fit to Wells</span>
        </button>

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
      <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 shadow-2xl backdrop-blur-md text-xs text-zinc-300 max-w-[260px]">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
          <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 flex items-center gap-1">
            <Layers className="h-3 w-3 text-amber-400" /> Map GIS Legend
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">{wells.length} wells</span>
        </div>

        <div className="space-y-1.5 text-[11px]">
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
        <div className="absolute bottom-4 right-4 z-10 rounded-xl border border-cyan-500/40 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md max-w-sm">
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
            Nearby offset analysis activated. Closest wells to target are highlighted.
          </p>
        </div>
      )}
    </div>
  );
}


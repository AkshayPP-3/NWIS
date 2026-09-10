"use client";

import dynamic from "next/dynamic";
import type { WellsMapProps } from "./LeafletMap";

// Dynamically import LeafletMap with SSR disabled to prevent "window is not defined"
const DynamicLeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="relative h-162.5 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"></div>
        <span className="font-mono text-xs text-zinc-400">
          Initializing Leaflet GIS Engine...
        </span>
      </div>
    </div>
  ),
});

export default function WellsMap(props: WellsMapProps) {
  return <DynamicLeafletMap {...props} />;
}

"use client";

import { useEffect, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";

type Well = {
  id: number;
  wellId: string;
  name: string;
  latitude: number;
  longitude: number;
  formation: string | null;
  status: string | null;
  totalDepth: number | null;
};

export default function WellsMap() {
  const [wells, setWells] = useState<Well[]>([]);
    const [selectedWell, setSelectedWell] = useState<Well | null>(null);

    const [newDrill, setNewDrill] = useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

  useEffect(() => {
    fetch("/api/wells")
      .then((res) => res.json())
      .then((data) => {
        console.log("WELLS:", data);
        setWells(data);
      })
      .catch((error) => {
        console.error("ERROR:", error);
      });
  }, []);

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-xl border">
      <Map
        initialViewState={{
          longitude: 94.91,
          latitude: 27.47,
          zoom: 11,
        }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onClick={(event) => {
          const { lng, lat } = event.lngLat;

          console.log("NEW DRILL:", lat, lng);

          setNewDrill({
            latitude: lat,
            longitude: lng,
          });

          setSelectedWell(null);
        }}
      >
        <NavigationControl position="top-right" />

        {wells.map((well) => (
          <Marker
            key={well.id}
            longitude={well.longitude}
            latitude={well.latitude}
            anchor="bottom"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                console.log("CLICKED:", well.wellId);
                setSelectedWell(well);
              }}
              style={{
                cursor: "pointer",
                fontSize: "32px",
                userSelect: "none",
              }}
            >
              📍
            </div>
          </Marker>
        ))}

        {newDrill && (
          <Marker
            longitude={newDrill.longitude}
            latitude={newDrill.latitude}
            anchor="bottom"
          >
            <div
              style={{
                cursor: "pointer",
                fontSize: "36px",
                userSelect: "none",
              }}
            >
              🎯
            </div>
          </Marker>
        )}

        {selectedWell && (
          <Popup
            longitude={selectedWell.longitude}
            latitude={selectedWell.latitude}
            anchor="bottom"
            closeOnClick={false}
            onClose={() => setSelectedWell(null)}
          >
            <div className="w-[220px] p-2">
              <h2 className="text-lg font-bold">{selectedWell.wellId}</h2>

              <p className="mt-1 text-sm">{selectedWell.name}</p>

              <hr className="my-2" />

              <p className="text-sm">
                <strong>Formation:</strong> {selectedWell.formation ?? "N/A"}
              </p>

              <p className="text-sm">
                <strong>Status:</strong> {selectedWell.status ?? "N/A"}
              </p>

              <p className="text-sm">
                <strong>Total Depth:</strong>{" "}
                {selectedWell.totalDepth
                  ? `${selectedWell.totalDepth} m`
                  : "N/A"}
              </p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
// Re-export improved Map component for backward compatibility
export { default } from "./map/WellsMap";

import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { calculateHaversineDistanceKm, calculateBearingDeg } from "@/lib/geo";
import type { NearbyWellInfo, WellEvent } from "@/types/well";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wellIdParam = searchParams.get("wellId");
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const radiusKm = searchParams.get("radius")
      ? parseFloat(searchParams.get("radius")!)
      : null;

    let targetLat: number | null = null;
    let targetLng: number | null = null;
    let targetWellId: string | null = null;
    let targetFormation: string | null = null;
    let targetDepth: number | null = null;

    const allWells = await db.orm.public.Well.where({}).all();
    const allEvents = await db.orm.public.WellEvent.where({}).all();

    // Map events by wellId
    const eventsByWell = new Map<number, WellEvent[]>();
    allEvents.forEach((evt) => {
      const list = eventsByWell.get(evt.wellId) || [];
      list.push(evt as WellEvent);
      eventsByWell.set(evt.wellId, list);
    });

    if (wellIdParam) {
      const targetWell = allWells.find(
        (w) => w.wellId === wellIdParam || String(w.id) === wellIdParam
      );
      if (targetWell) {
        targetLat = targetWell.latitude;
        targetLng = targetWell.longitude;
        targetWellId = targetWell.wellId;
        targetFormation = targetWell.formation;
        targetDepth = targetWell.totalDepth;
      }
    } else if (latParam && lngParam) {
      targetLat = parseFloat(latParam);
      targetLng = parseFloat(lngParam);
    }

    if (targetLat === null || targetLng === null) {
      return NextResponse.json(
        { error: "Must provide either wellId or lat and lng coordinates" },
        { status: 400 }
      );
    }

    const nearbyList: NearbyWellInfo[] = allWells
      .filter((w) => (targetWellId ? w.wellId !== targetWellId : true))
      .map((w) => {
        const distanceKm = calculateHaversineDistanceKm(
          targetLat!,
          targetLng!,
          w.latitude,
          w.longitude
        );
        const bearingDeg = calculateBearingDeg(
          targetLat!,
          targetLng!,
          w.latitude,
          w.longitude
        );
        const evts = eventsByWell.get(w.id) || [];
        const highSev = evts.filter((e) => e.severity === "High").length;
        const depthDiff =
          targetDepth !== null && w.totalDepth !== null
            ? Math.round((w.totalDepth - targetDepth) * 10) / 10
            : null;

        return {
          ...w,
          distanceKm,
          distanceMeters: Math.round(distanceKm * 1000),
          bearingDeg,
          sameFormation:
            !!targetFormation &&
            !!w.formation &&
            targetFormation.toLowerCase().trim() ===
              w.formation.toLowerCase().trim(),
          depthDifference: depthDiff,
          eventsCount: evts.length,
          highSeverityEvents: highSev,
          recentEvent: evts.length > 0 ? evts[0] : null,
        };
      })
      .filter((w) => (radiusKm ? w.distanceKm <= radiusKm : true))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({
      target: {
        wellId: targetWellId,
        latitude: targetLat,
        longitude: targetLng,
        formation: targetFormation,
        totalDepth: targetDepth,
      },
      radiusKm,
      totalFound: nearbyList.length,
      wells: nearbyList,
    });
  } catch (error) {
    console.error("NEARBY WELLS API ERROR:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate nearby wells",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import type { FieldAnalytics } from "@/types/well";

export async function GET() {
  try {
    const [wells, events] = await Promise.all([
      db.orm.public.Well.where({}).all(),
      db.orm.public.WellEvent.where({}).all(),
    ]);

    const statusCounts = {
      completed: 0,
      drilling: 0,
      abandoned: 0,
      other: 0,
    };

    const formationMap = new Map<
      string,
      { count: number; totalDepth: number; depths: number[]; eventCount: number }
    >();

    const allDepths: number[] = [];

    wells.forEach((w) => {
      // Status counting
      const st = (w.status || "").toLowerCase();
      if (st === "completed") statusCounts.completed++;
      else if (st === "drilling") statusCounts.drilling++;
      else if (st === "abandoned") statusCounts.abandoned++;
      else statusCounts.other++;

      // Formation counting
      const fmt = w.formation || "Unspecified Formation";
      const existing = formationMap.get(fmt) || {
        count: 0,
        totalDepth: 0,
        depths: [],
        eventCount: 0,
      };
      existing.count++;
      if (w.totalDepth) {
        existing.totalDepth += w.totalDepth;
        existing.depths.push(w.totalDepth);
        allDepths.push(w.totalDepth);
      }
      formationMap.set(fmt, existing);
    });

    // Event counting
    const eventSeverityCounts = {
      high: 0,
      medium: 0,
      low: 0,
    };
    const eventTypeCounts: Record<string, number> = {};

    events.forEach((e) => {
      const sev = (e.severity || "").toLowerCase();
      if (sev === "high") eventSeverityCounts.high++;
      else if (sev === "medium") eventSeverityCounts.medium++;
      else eventSeverityCounts.low++;

      const type = e.eventType || "General Anomaly";
      eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;

      // Associate with formation
      const w = wells.find((well) => well.id === e.wellId);
      if (w) {
        const fmt = w.formation || "Unspecified Formation";
        const entry = formationMap.get(fmt);
        if (entry) entry.eventCount++;
      }
    });

    const formationStats = Array.from(formationMap.entries()).map(
      ([formation, data]) => ({
        formation,
        count: data.count,
        avgDepth:
          data.depths.length > 0
            ? Math.round(data.totalDepth / data.depths.length)
            : 0,
        minDepth: data.depths.length > 0 ? Math.min(...data.depths) : 0,
        maxDepth: data.depths.length > 0 ? Math.max(...data.depths) : 0,
        eventCount: data.eventCount,
      })
    );

    // Depth distributions
    allDepths.sort((a, b) => a - b);
    const minDepth = allDepths.length > 0 ? allDepths[0] : 0;
    const maxDepth =
      allDepths.length > 0 ? allDepths[allDepths.length - 1] : 0;
    const avgDepth =
      allDepths.length > 0
        ? Math.round(
            allDepths.reduce((acc, d) => acc + d, 0) / allDepths.length
          )
        : 0;
    const medianDepth =
      allDepths.length > 0
        ? allDepths[Math.floor(allDepths.length / 2)]
        : 0;

    const analytics: FieldAnalytics = {
      totalWells: wells.length,
      statusCounts,
      formationStats,
      eventSeverityCounts,
      eventTypeCounts,
      depthDistribution: {
        min: minDepth,
        max: maxDepth,
        avg: avgDepth,
        median: medianDepth,
      },
      riskSummary: {
        criticalRisks: eventSeverityCounts.high,
        activeAlerts: events.length,
      },
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("ANALYTICS API ERROR:", error);
    return NextResponse.json(
      {
        error: "Failed to generate analytics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


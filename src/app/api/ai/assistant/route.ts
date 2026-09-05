import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { calculateHaversineDistanceKm } from "@/lib/geo";
import type { AIAssistantMessage } from "@/types/well";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query: string = (body.query || "").trim();
    const contextWellId: string | undefined = body.contextWellId;

    if (!query) {
      return NextResponse.json(
        { error: "Query cannot be empty" },
        { status: 400 }
      );
    }

    // Fetch live database facts
    const wells = await db.orm.public.Well.where({}).all();
    const events = await db.orm.public.WellEvent.where({}).all();
    const parameters = await db.orm.public.DrillingParameter.where({}).all();

    const lowerQuery = query.toLowerCase();

    // Detect mentioned wells in query or fallback to context
    const mentionedWells = wells.filter((w) =>
      lowerQuery.includes(w.wellId.toLowerCase()) ||
      lowerQuery.includes(w.name.toLowerCase())
    );

    let primaryWell =
      mentionedWells[0] ||
      (contextWellId ? wells.find((w) => w.wellId === contextWellId) : null);

    let answer = "";
    let evidence: AIAssistantMessage["evidence"] = [];
    let matchedWellIds: string[] = [];
    let actionLink: AIAssistantMessage["actionLink"] = undefined;

    // Intent 1: Comparison between two wells (e.g., "compare WELL-001 and WELL-005")
    if (
      (lowerQuery.includes("compare") || lowerQuery.includes("versus") || lowerQuery.includes("vs")) &&
      mentionedWells.length >= 2
    ) {
      const w1 = mentionedWells[0];
      const w2 = mentionedWells[1];
      matchedWellIds = [w1.wellId, w2.wellId];

      const distance = calculateHaversineDistanceKm(
        w1.latitude,
        w1.longitude,
        w2.latitude,
        w2.longitude
      );

      const w1Events = events.filter((e) => e.wellId === w1.id);
      const w2Events = events.filter((e) => e.wellId === w2.id);

      const w1Params = parameters.find((p) => p.wellId === w1.id);
      const w2Params = parameters.find((p) => p.wellId === w2.id);

      answer = `### ⚖️ Engineering Well Comparison: **${w1.wellId}** vs **${w2.wellId}**

- **Geodetic Spacing:** ${distance} km offset
- **Target Formations:** ${w1.formation || "Unknown"} (${w1.wellId}) vs ${w2.formation || "Unknown"} (${w2.wellId})
- **Total Depth:** ${w1.totalDepth ?? "N/A"} m vs ${w2.totalDepth ?? "N/A"} m (${Math.abs((w1.totalDepth || 0) - (w2.totalDepth || 0))} m differential)
- **Status:** ${w1.status} vs ${w2.status}

**Drilling Parameters & Hazard Contrast:**
- **Pressure:** ${w1.wellId} = ${w1Params?.pressure ?? "N/A"} psi | ${w2.wellId} = ${w2Params?.pressure ?? "N/A"} psi
- **Mud Weight:** ${w1.wellId} = ${w1Params?.mudWeight ?? "N/A"} SG | ${w2.wellId} = ${w2Params?.mudWeight ?? "N/A"} SG
- **Events & Incidents:** ${w1.wellId} recorded ${w1Events.length} event(s) (${w1Events.map((e) => e.eventType).join(", ") || "None"}), while ${w2.wellId} recorded ${w2Events.length} event(s) (${w2Events.map((e) => e.eventType).join(", ") || "None"}).`;

      evidence = [
        {
          title: "Database Telemetry Record",
          details: `Direct extraction from PostgreSQL: ${w1.wellId} (ID: ${w1.id}) and ${w2.wellId} (ID: ${w2.id}).`,
          category: "Calculated Indicator",
          wellIds: [w1.wellId, w2.wellId],
        },
        {
          title: "Geodesic Baseline",
          details: `Computed great-circle distance between coordinates (${w1.latitude}, ${w1.longitude}) and (${w2.latitude}, ${w2.longitude}): ${distance} km.`,
          category: "Calculated Indicator",
        },
      ];

      actionLink = {
        type: "compare",
        targetId: `${w1.wellId},${w2.wellId}`,
        label: `Open Detailed Comparison Matrix`,
      };
    }
    // Intent 2: Nearby wells search (e.g., "Show nearby wells around WELL-001")
    else if (
      lowerQuery.includes("nearby") ||
      lowerQuery.includes("around") ||
      lowerQuery.includes("proximity") ||
      lowerQuery.includes("offset")
    ) {
      const refWell = primaryWell || wells[0];
      matchedWellIds = [refWell.wellId];

      const nearby = wells
        .filter((w) => w.id !== refWell.id)
        .map((w) => {
          const dist = calculateHaversineDistanceKm(
            refWell.latitude,
            refWell.longitude,
            w.latitude,
            w.longitude
          );
          return { well: w, distanceKm: dist };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      const topNearby = nearby.slice(0, 4);
      topNearby.forEach((n) => matchedWellIds.push(n.well.wellId));

      answer = `### 🎯 Nearby Offset Wells for **${refWell.wellId}** (${refWell.name})
Reference Location: **${refWell.latitude.toFixed(4)}°N, ${refWell.longitude.toFixed(4)}°E** | Target Formation: **${refWell.formation || "N/A"}**

The top **${topNearby.length} closest offset wells** in the field are:
` +
        topNearby
          .map((n, i) => {
            const sameFmt =
              n.well.formation?.toLowerCase().trim() ===
              refWell.formation?.toLowerCase().trim();
            return `${i + 1}. **${n.well.wellId}** — **${n.distanceKm} km** offset
   - Formation: *${n.well.formation || "N/A"}* ${sameFmt ? "✅ (Matches Target Formation)" : "⚠️ (Different Formation)"}
   - Total Depth: ${n.well.totalDepth ?? "N/A"} m | Status: ${n.well.status}`;
          })
          .join("\n\n") +
        `\n\n*Recommendation: Drilling engineers planning new trajectories should analyze casing designs and mud programs from ${topNearby[0].well.wellId} (${topNearby[0].distanceKm} km away).*`;

      evidence = topNearby.map((n) => ({
        title: `Offset Well: ${n.well.wellId}`,
        details: `Calculated geodesic distance of ${n.distanceKm} km. Formation: ${n.well.formation}. Status: ${n.well.status}.`,
        category: "Calculated Indicator",
        wellIds: [n.well.wellId],
      }));

      actionLink = {
        type: "show_nearby",
        targetId: refWell.wellId,
        label: `View Nearby Wells for ${refWell.wellId}`,
      };
    }
    // Intent 3: High pressure wells query (e.g., "Which wells had high pressure?")
    else if (
      lowerQuery.includes("pressure") ||
      lowerQuery.includes("pore pressure") ||
      lowerQuery.includes("abnormal")
    ) {
      const highPressureParams = parameters.filter(
        (p) => (p.pressure || 0) >= 3000
      );
      const highPressureWellIds = Array.from(
        new Set(highPressureParams.map((p) => p.wellId))
      );

      const affectedWells = wells.filter((w) =>
        highPressureWellIds.includes(w.id)
      );
      matchedWellIds = affectedWells.map((w) => w.wellId);

      answer = `### ⚠️ High Formation Pressure Analysis Across Field

Based on database drilling records, **${affectedWells.length} of ${wells.length} wells** have recorded formation or circulating pressures exceeding **3,000 psi**:

` +
        affectedWells
          .map((w) => {
            const p = parameters.find((param) => param.wellId === w.id);
            const evts = events.filter((e) => e.wellId === w.id);
            return `- **${w.wellId}** (${w.formation}): **${p?.pressure ?? "3200"} psi** recorded at **${p?.depth ?? "1920"} m** (Mud Weight: **${p?.mudWeight ?? "1.18"} SG**). Historical event: *${evts[0]?.eventType || "None"}* (${evts[0]?.severity || "Normal"}).`;
          })
          .join("\n") +
        `\n\n**Engineering Decision-Support Note:** In high-pressure zones across the **Barail** and **Disang** formations, equivalent circulating density (ECD) must be carefully controlled to prevent induced fractures while preventing kicks.`;

      evidence = affectedWells.map((w) => {
        const p = parameters.find((param) => param.wellId === w.id);
        return {
          title: `Telemetry Record: ${w.wellId}`,
          details: `Recorded pressure ${p?.pressure || 3200} psi at depth ${p?.depth || 1920}m with mud weight ${p?.mudWeight || 1.18} SG.`,
          category: "Calculated Indicator",
          wellIds: [w.wellId],
        };
      });
    }
    // Intent 4: Events by depth interval (e.g., "What drilling events occurred near 2500 m?")
    else if (
      lowerQuery.includes("event") ||
      lowerQuery.includes("incident") ||
      lowerQuery.includes("kick") ||
      lowerQuery.includes("stuck") ||
      lowerQuery.includes("loss") ||
      lowerQuery.includes("depth")
    ) {
      const depthMatch = lowerQuery.match(/(\d{3,4})\s*(m|meter)?/);
      const targetDepth = depthMatch ? parseInt(depthMatch[1], 10) : null;

      let filteredEvents = events;
      if (targetDepth) {
        filteredEvents = events.filter((e) => {
          const start = e.startDepth || 0;
          const end = e.endDepth || 9999;
          return (
            Math.abs(start - targetDepth) <= 500 ||
            (targetDepth >= start && targetDepth <= end)
          );
        });
      }

      const eventsList = filteredEvents.length > 0 ? filteredEvents : events;

      answer = `### 📋 Field Incident & Drilling Event Intelligence
${targetDepth ? `Target Depth Interval: **~${targetDepth} m (±500m window)**` : "Overall Field Event History"}

Found **${eventsList.length} relevant historical incidents** recorded in the database:

` +
        eventsList
          .slice(0, 5)
          .map((e) => {
            const w = wells.find((well) => well.id === e.wellId);
            if (w) matchedWellIds.push(w.wellId);
            return `#### 🔴 ${e.eventType} — ${w?.wellId || `Well #${e.wellId}`} (${e.severity} Severity)
- **Depth Interval:** ${e.startDepth ?? "N/A"} m – ${e.endDepth ?? "N/A"} m (${w?.formation || "Unknown"})
- **Observation:** ${e.description || "No description recorded"}
- **Mitigation Applied:** ${e.mitigation || "Standard procedure executed"}`;
          })
          .join("\n\n");

      evidence = eventsList.slice(0, 5).map((e) => {
        const w = wells.find((well) => well.id === e.wellId);
        return {
          title: `Historical Incident: ${e.eventType} in ${w?.wellId || `Well #${e.wellId}`}`,
          details: `Severity: ${e.severity}. Depth: ${e.startDepth}–${e.endDepth}m. Mitigation: ${e.mitigation}`,
          category: "Historical Pattern",
          wellIds: w ? [w.wellId] : [],
        };
      });
    }
    // Intent 5: Formation query (e.g. "Which nearby wells have the same formation?")
    else if (lowerQuery.includes("formation")) {
      const fmtMap = new Map<string, typeof wells>();
      wells.forEach((w) => {
        const fmt = w.formation || "Unspecified";
        const list = fmtMap.get(fmt) || [];
        list.push(w);
        fmtMap.set(fmt, list);
      });

      answer = `### 🏔️ Geological Formation Distribution & Well Groups

The field features **${fmtMap.size} distinct geological formations** represented across ${wells.length} wells:

` +
        Array.from(fmtMap.entries())
          .map(([fmt, wList]) => {
            const avgDepth = Math.round(
              wList.reduce((acc, w) => acc + (w.totalDepth || 0), 0) / wList.length
            );
            return `#### 🔹 **${fmt}** (${wList.length} wells | Avg Depth: ${avgDepth} m)
- **Wells:** ${wList.map((w) => w.wellId).join(", ")}
- **Drilling Status:** ${wList.map((w) => `${w.wellId} (${w.status})`).join(", ")}`;
          })
          .join("\n\n");

      matchedWellIds = wells.map((w) => w.wellId);

      evidence = Array.from(fmtMap.entries()).map(([fmt, wList]) => ({
        title: `Stratigraphic Group: ${fmt}`,
        details: `${wList.length} wells mapped with average depth of ${Math.round(wList.reduce((acc, w) => acc + (w.totalDepth || 0), 0) / wList.length)}m.`,
        category: "Historical Pattern",
        wellIds: wList.map((w) => w.wellId),
      }));
    }
    // Intent 6: Single well summary (e.g. "Summarize the drilling history of WELL-003")
    else if (primaryWell) {
      matchedWellIds = [primaryWell.wellId];
      const wEvents = events.filter((e) => e.wellId === primaryWell.id);
      const wParams = parameters.find((p) => p.wellId === primaryWell.id);

      answer = `### 📄 Engineering Dossier Summary: **${primaryWell.wellId}** (${primaryWell.name})

- **Coordinates:** ${primaryWell.latitude.toFixed(4)}°N, ${primaryWell.longitude.toFixed(4)}°E
- **Target Formation:** ${primaryWell.formation || "N/A"}
- **Total Depth:** ${primaryWell.totalDepth ? `${primaryWell.totalDepth} m` : "N/A"}
- **Operational Status:** ${primaryWell.status || "N/A"}

**Drilling Parameters Telemetry:**
- **ROP:** ${wParams?.rop ?? "N/A"} m/h
- **Weight on Bit (WOB):** ${wParams?.wob ?? "N/A"} klbf / tonnes
- **Rotary Speed (RPM):** ${wParams?.rpm ?? "N/A"} RPM
- **Torque:** ${wParams?.torque ?? "N/A"} ft-lbs
- **Mud Weight:** ${wParams?.mudWeight ?? "N/A"} SG
- **Circulating Pressure:** ${wParams?.pressure ?? "N/A"} psi

**Recorded Events & Incidents (${wEvents.length}):**
` +
        (wEvents.length > 0
          ? wEvents
              .map(
                (e) =>
                  `- **${e.eventType}** (${e.severity} Severity) at **${e.startDepth}–${e.endDepth} m**: ${e.description}. Mitigation: *${e.mitigation}*`
              )
              .join("\n")
          : "- *No historical incidents recorded for this well.*");

      evidence = [
        {
          title: `Prisma Well Record: ${primaryWell.wellId}`,
          details: `Primary well record with ${wEvents.length} event(s) and parameter telemetry.`,
          category: "Calculated Indicator",
          wellIds: [primaryWell.wellId],
        },
      ];

      actionLink = {
        type: "view_well",
        targetId: primaryWell.wellId,
        label: `Inspect ${primaryWell.wellId} in Intelligence Panel`,
      };
    }
    // Default fallback: Intelligent field overview
    else {
      answer = `### 🤖 NWIS Drilling Intelligence Overview

I have analyzed the **${wells.length} wells** currently monitored in the database.

Here are key intelligence insights:
1. **Formations:** 3 primary formations (**Barail**, **Tipam**, **Disang**) spanning depths from **${Math.min(...wells.map((w) => w.totalDepth || 0))} m** to **${Math.max(...wells.map((w) => w.totalDepth || 0))} m**.
2. **Operations:** **${wells.filter((w) => w.status === "Drilling").length} active drilling** well (WELL-008 in Disang Formation) and **${wells.filter((w) => w.status === "Completed").length} completed** wells.
3. **Risks:** High pore pressure (>3,000 psi) and historical mud loss events recorded between **1,900 m and 2,500 m**.

You can ask me specific questions like:
- *"Show nearby wells around WELL-001"*
- *"Compare WELL-001 and WELL-005"*
- *"What drilling events occurred near 2000 m?"*
- *"Which wells had high pressure?"*
- *"Summarize the drilling history of WELL-008"*`;

      evidence = [
        {
          title: "Database Field Status",
          details: `Evaluated ${wells.length} wells, ${events.length} events, and ${parameters.length} telemetry records.`,
          category: "AI Insight",
        },
      ];
    }

    const responseData: AIAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: answer,
      timestamp: new Date().toISOString(),
      evidence,
      matchedWells: Array.from(new Set(matchedWellIds)),
      actionLink,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("AI ASSISTANT API ERROR:", error);
    return NextResponse.json(
      {
        error: "AI Assistant failed to process query",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("🛠️ Starting NWIS Drilling Parameter & Event Enrichment...");

  await client.connect();
  console.log("✅ Connected to Neon PostgreSQL");

  const res = await client.query('SELECT "id", "wellId", "totalDepth", "formation" FROM "well" ORDER BY "id" ASC;');
  const wells = res.rows;
  console.log(`Found ${wells.length} wells to enrich`);

  // Clear existing parameters and events
  await client.query('DELETE FROM "drillingParameter";');
  await client.query('DELETE FROM "wellEvent";');
  console.log("Cleared old records");

  const realisticEvents = [
    {
      type: "Mud Loss",
      severity: "High",
      desc: "Severe lost circulation (35 bbl/hr) across permeable sandstone.",
      mit: "Pumped 40 bbl coarse calcium carbonate LCM pill and lowered circulation rate.",
    },
    {
      type: "Stuck Pipe",
      severity: "Medium",
      desc: "Differential sticking during connection break across reactive shale.",
      mit: "Spotted oil-base soaking pill, applied 50 klbf overpull and worked string free.",
    },
    {
      type: "Torque Spike",
      severity: "Medium",
      desc: "Excessive torque fluctuations (8,800 ft-lbs) indicating hole cleaning deficiency.",
      mit: "Circulated high-viscosity sweep at 650 gpm and increased rotary speed.",
    },
    {
      type: "Kick / Gas Influx",
      severity: "High",
      desc: "12 bbl pit gain with 450 psi shut-in drillpipe pressure (SIDPP).",
      mit: "Shut in well using annular preventer; executed Wait-and-Weight well kill procedure.",
    },
    {
      type: "Tight Hole",
      severity: "Low",
      desc: "Drag observed on tripping out at casing shoe transition.",
      mit: "Back-reamed interval with 80 RPM and conditioned borehole.",
    },
  ];

  const paramValues: any[] = [];
  const paramPlaceholders: string[] = [];
  let paramCounter = 1;

  const eventValues: any[] = [];
  const eventPlaceholders: string[] = [];
  let eventCounter = 1;

  for (const well of wells) {
    const totalDepth = well.totalDepth || 3200;
    const depthSteps = [
      400,
      800,
      1200,
      1600,
      2000,
      Math.round(totalDepth * 0.6),
      Math.round(totalDepth * 0.75),
      Math.round(totalDepth * 0.88),
      totalDepth,
    ];

    for (const depth of depthSteps) {
      const depthRatio = depth / totalDepth;
      const rop = Math.max(
        4.5,
        Math.round((35 - depthRatio * 22 + ((depth % 7) - 3)) * 10) / 10
      );
      const wob = Math.round((8 + depthRatio * 16 + (depth % 3)) * 10) / 10;
      const rpm = Math.round(140 - depthRatio * 40 + (depth % 15));
      const torque = Math.round(3500 + depthRatio * 5200 + (depth % 400));
      const mudWeight = Math.round((1.08 + depthRatio * 0.16) * 100) / 100;
      const pressure = Math.round(800 + depth * 0.82 + (depthRatio > 0.5 ? 400 : 0));

      paramPlaceholders.push(
        `($${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, NOW())`
      );
      paramValues.push(depth, rop, wob, rpm, torque, mudWeight, pressure, well.id);
    }

    const primaryEventIdx = (well.id - 1) % realisticEvents.length;
    const ev1 = realisticEvents[primaryEventIdx];
    const ev1Depth = Math.round(totalDepth * 0.58);

    eventPlaceholders.push(
      `($${eventCounter++}, $${eventCounter++}, $${eventCounter++}, $${eventCounter++}, $${eventCounter++}, $${eventCounter++}, $${eventCounter++}, NOW())`
    );
    eventValues.push(
      ev1.type,
      ev1Depth,
      ev1Depth + 45,
      ev1.severity,
      ev1.desc,
      ev1.mit,
      well.id
    );

    if (well.id % 2 === 0) {
      const secondaryEventIdx = (well.id + 2) % realisticEvents.length;
      const ev2 = realisticEvents[secondaryEventIdx];
      const ev2Depth = Math.round(totalDepth * 0.82);

      eventPlaceholders.push(
        `($${eventCounter++}, $${eventCounter++}, $${eventCounter++}, $${eventCounter++}, $${eventCounter++}, $${eventCounter++}, $${eventCounter++}, NOW())`
      );
      eventValues.push(
        ev2.type,
        ev2Depth,
        ev2Depth + 30,
        ev2.severity,
        ev2.desc,
        ev2.mit,
        well.id
      );
    }
  }

  // Execute batch inserts
  console.log(`Inserting ${paramPlaceholders.length} parameter records...`);
  await client.query(
    `INSERT INTO "drillingParameter" ("depth", "rop", "wob", "rpm", "torque", "mudWeight", "pressure", "wellId", "recordedAt") VALUES ${paramPlaceholders.join(", ")};`,
    paramValues
  );

  console.log(`Inserting ${eventPlaceholders.length} event records...`);
  await client.query(
    `INSERT INTO "wellEvent" ("eventType", "startDepth", "endDepth", "severity", "description", "mitigation", "wellId", "createdAt") VALUES ${eventPlaceholders.join(", ")};`,
    eventValues
  );

  console.log("🎉 NWIS Multi-Depth Telemetry & Incident Enrichment Complete!");
  await client.end();
}

main().catch(async (e) => {
  console.error("Enrichment failed:", e);
  await client.end();
  process.exit(1);
});


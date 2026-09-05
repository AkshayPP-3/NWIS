import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const wells = [
  {
    wellId: "WELL-001",
    name: "NWIS Demo Well 01",
    latitude: 27.4728,
    longitude: 94.912,
    totalDepth: 3200,
    formation: "Barail Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-002",
    name: "NWIS Demo Well 02",
    latitude: 27.4785,
    longitude: 94.9185,
    totalDepth: 3450,
    formation: "Barail Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-003",
    name: "NWIS Demo Well 03",
    latitude: 27.4662,
    longitude: 94.9055,
    totalDepth: 2980,
    formation: "Tipam Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-004",
    name: "NWIS Demo Well 04",
    latitude: 27.484,
    longitude: 94.902,
    totalDepth: 3600,
    formation: "Tipam Formation",
    status: "Abandoned",
  },
  {
    wellId: "WELL-005",
    name: "NWIS Demo Well 05",
    latitude: 27.459,
    longitude: 94.921,
    totalDepth: 3100,
    formation: "Barail Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-006",
    name: "NWIS Demo Well 06",
    latitude: 27.49,
    longitude: 94.925,
    totalDepth: 3800,
    formation: "Disang Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-007",
    name: "NWIS Demo Well 07",
    latitude: 27.452,
    longitude: 94.897,
    totalDepth: 2750,
    formation: "Tipam Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-008",
    name: "NWIS Demo Well 08",
    latitude: 27.495,
    longitude: 94.91,
    totalDepth: 4100,
    formation: "Disang Formation",
    status: "Drilling",
  },
  {
    wellId: "WELL-009",
    name: "NWIS Demo Well 09",
    latitude: 27.445,
    longitude: 94.915,
    totalDepth: 2900,
    formation: "Barail Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-010",
    name: "NWIS Demo Well 10",
    latitude: 27.475,
    longitude: 94.89,
    totalDepth: 3350,
    formation: "Tipam Formation",
    status: "Completed",
  },
];

const eventTypes = [
  {
    eventType: "Mud Loss",
    severity: "High",
    description: "Significant mud loss observed while drilling.",
    mitigation: "Lost circulation material was pumped.",
  },
  {
    eventType: "Stuck Pipe",
    severity: "Medium",
    description: "Drill string experienced increased drag and became stuck.",
    mitigation: "Worked the pipe and circulated high-viscosity mud.",
  },
  {
    eventType: "Torque Spike",
    severity: "Medium",
    description: "Sudden increase in drilling torque detected.",
    mitigation: "Reduced WOB and optimized rotary speed.",
  },
  {
    eventType: "Kick",
    severity: "High",
    description: "Unexpected increase in formation pressure indicated a kick.",
    mitigation: "Well was shut in and pressure control procedures initiated.",
  },
  {
    eventType: "Cementing Issue",
    severity: "Low",
    description: "Cement placement required additional monitoring.",
    mitigation: "Additional cement evaluation was performed.",
  },
];

async function main() {
  console.log("🌱 Starting NWIS seed...");

  await client.connect();

  console.log("✅ Connected to Neon PostgreSQL");

  // Insert wells
  for (const well of wells) {
    const result = await client.query(
      `
      INSERT INTO "well"
        ("wellId", "name", "latitude", "longitude", "totalDepth",
         "formation", "status", "createdAt", "updatedAt")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT ("wellId") DO UPDATE SET
        "name" = EXCLUDED."name",
        "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude",
        "totalDepth" = EXCLUDED."totalDepth",
        "formation" = EXCLUDED."formation",
        "status" = EXCLUDED."status",
        "updatedAt" = NOW()
      RETURNING "id", "wellId";
      `,
      [
        well.wellId,
        well.name,
        well.latitude,
        well.longitude,
        well.totalDepth,
        well.formation,
        well.status,
      ],
    );

    const wellId = result.rows[0].id;

    console.log(`📍 ${well.wellId} inserted`);

    // Add one historical event to each well
    const event = eventTypes[(wellId - 1) % eventTypes.length];

    await client.query(
      `
      INSERT INTO "wellEvent"
        ("eventType", "startDepth", "endDepth", "severity",
         "description", "mitigation", "wellId", "createdAt")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, NOW());
      `,
      [
        event.eventType,
        Math.round(well.totalDepth * 0.6),
        Math.round(well.totalDepth * 0.62),
        event.severity,
        event.description,
        event.mitigation,
        wellId,
      ],
    );

    // Add a drilling parameter record
    await client.query(
      `
      INSERT INTO "drillingParameter"
        ("depth", "rop", "wob", "rpm", "torque",
         "mudWeight", "pressure", "wellId", "recordedAt")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, NOW());
      `,
      [
        Math.round(well.totalDepth * 0.6),
        18.5,
        12.2,
        120,
        8500,
        1.18,
        3200,
        wellId,
      ],
    );
  }

  console.log("");
  console.log("🎉 NWIS seed completed!");
  console.log(`📊 ${wells.length} wells processed`);

  await client.end();
}

main().catch(async (error) => {
  console.error("❌ Seed failed:", error);
  await client.end();
  process.exit(1);
});

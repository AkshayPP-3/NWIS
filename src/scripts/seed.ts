import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// 1. Preserved Existing 10 Wells (Assam-Arakan Basin, India)
const existingWells = [
  {
    wellId: "WELL-001",
    name: "NWIS Demo Well 01 (Upper Assam)",
    latitude: 27.4728,
    longitude: 94.912,
    totalDepth: 3200,
    formation: "Barail Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-002",
    name: "NWIS Demo Well 02 (Upper Assam)",
    latitude: 27.4785,
    longitude: 94.9185,
    totalDepth: 3450,
    formation: "Barail Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-003",
    name: "NWIS Demo Well 03 (Upper Assam)",
    latitude: 27.4662,
    longitude: 94.9055,
    totalDepth: 2980,
    formation: "Tipam Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-004",
    name: "NWIS Demo Well 04 (Upper Assam)",
    latitude: 27.484,
    longitude: 94.902,
    totalDepth: 3600,
    formation: "Tipam Formation",
    status: "Abandoned",
  },
  {
    wellId: "WELL-005",
    name: "NWIS Demo Well 05 (Upper Assam)",
    latitude: 27.459,
    longitude: 94.921,
    totalDepth: 3100,
    formation: "Barail Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-006",
    name: "NWIS Demo Well 06 (Upper Assam)",
    latitude: 27.49,
    longitude: 94.925,
    totalDepth: 3800,
    formation: "Disang Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-007",
    name: "NWIS Demo Well 07 (Upper Assam)",
    latitude: 27.452,
    longitude: 94.897,
    totalDepth: 2750,
    formation: "Tipam Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-008",
    name: "NWIS Demo Well 08 (Upper Assam)",
    latitude: 27.495,
    longitude: 94.91,
    totalDepth: 4100,
    formation: "Disang Formation",
    status: "Drilling",
  },
  {
    wellId: "WELL-009",
    name: "NWIS Demo Well 09 (Upper Assam)",
    latitude: 27.445,
    longitude: 94.915,
    totalDepth: 2900,
    formation: "Barail Formation",
    status: "Completed",
  },
  {
    wellId: "WELL-010",
    name: "NWIS Demo Well 10 (Upper Assam)",
    latitude: 27.475,
    longitude: 94.89,
    totalDepth: 3350,
    formation: "Tipam Formation",
    status: "Completed",
  },
];

// 2. Realistic Pan-India Sedimentary Basins & Oilfields (Strictly within India)
const indianBasinRegions = [
  // 1. Cambay Basin (Gujarat)
  { basin: "Cambay Basin (Gujarat)", field: "Ankleshwar", lat: 21.63, lng: 73.01 },
  { basin: "Cambay Basin (Gujarat)", field: "Gandhar", lat: 21.88, lng: 72.82 },
  { basin: "Cambay Basin (Gujarat)", field: "Mehsana", lat: 23.58, lng: 72.39 },
  { basin: "Cambay Basin (Gujarat)", field: "Kalol", lat: 23.23, lng: 72.51 },
  { basin: "Cambay Basin (Gujarat)", field: "Sanand", lat: 22.99, lng: 72.37 },
  { basin: "Cambay Basin (Gujarat)", field: "Cambay Onshore", lat: 22.31, lng: 72.62 },

  // 2. Barmer / Rajasthan Basin (Rajasthan)
  { basin: "Barmer Basin (Rajasthan)", field: "Mangala", lat: 25.82, lng: 71.24 },
  { basin: "Barmer Basin (Rajasthan)", field: "Bhagyam", lat: 25.98, lng: 71.31 },
  { basin: "Barmer Basin (Rajasthan)", field: "Aishwariya", lat: 25.75, lng: 71.18 },
  { basin: "Barmer Basin (Rajasthan)", field: "Raageshwari", lat: 25.48, lng: 71.42 },
  { basin: "Barmer Basin (Rajasthan)", field: "Guda Field", lat: 25.61, lng: 71.55 },

  // 3. Krishna-Godavari (KG) Basin (Andhra Pradesh)
  { basin: "KG Basin (Andhra Pradesh)", field: "Mandapeta", lat: 16.85, lng: 81.93 },
  { basin: "KG Basin (Andhra Pradesh)", field: "Razole", lat: 16.48, lng: 81.84 },
  { basin: "KG Basin (Andhra Pradesh)", field: "Endamuru", lat: 16.71, lng: 82.02 },
  { basin: "KG Basin (Andhra Pradesh)", field: "Mori Onshore", lat: 16.41, lng: 81.75 },
  { basin: "KG Basin (Andhra Pradesh)", field: "Kakinada Coastal", lat: 16.98, lng: 82.24 },

  // 4. Cauvery Basin (Tamil Nadu)
  { basin: "Cauvery Basin (Tamil Nadu)", field: "Narimanam", lat: 10.82, lng: 79.74 },
  { basin: "Cauvery Basin (Tamil Nadu)", field: "Bhuvanagiri", lat: 11.45, lng: 79.64 },
  { basin: "Cauvery Basin (Tamil Nadu)", field: "Kovikalpal", lat: 10.68, lng: 79.62 },
  { basin: "Cauvery Basin (Tamil Nadu)", field: "Adiyakkamangalam", lat: 10.77, lng: 79.71 },

  // 5. Assam-Arakan Basin (Assam / Northeast India)
  { basin: "Assam Basin (Assam)", field: "Naharkatiya", lat: 27.28, lng: 95.16 },
  { basin: "Assam Basin (Assam)", field: "Moran", lat: 27.18, lng: 94.92 },
  { basin: "Assam Basin (Assam)", field: "Digboi", lat: 27.38, lng: 95.63 },
  { basin: "Assam Basin (Assam)", field: "Rudrasagar", lat: 26.98, lng: 94.62 },
  { basin: "Assam Basin (Assam)", field: "Duliajan", lat: 27.35, lng: 95.31 },
  { basin: "Assam Basin (Assam)", field: "Lakwa", lat: 26.99, lng: 94.86 },
  { basin: "Assam Basin (Assam)", field: "Geleki", lat: 26.85, lng: 94.75 },
  { basin: "Assam Basin (Assam)", field: "Jorhat", lat: 26.75, lng: 94.22 },
  { basin: "Assam Basin (Assam)", field: "Tinsukia", lat: 27.50, lng: 95.36 },
  { basin: "Assam Basin (Assam)", field: "Borholla", lat: 26.62, lng: 94.15 },
];

const formations = [
  "Barail Formation",
  "Tipam Formation",
  "Disang Formation",
];

// Deterministic pseudo-random helper for consistent generation
function seededNumber(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate 90 synthetic India-based wells (WELL-011 to WELL-100)
const syntheticWells = Array.from({ length: 90 }, (_, index) => {
  const wellNumber = index + 11;
  const padNum = String(wellNumber).padStart(3, "0");
  const regionIndex = index % indianBasinRegions.length;
  const region = indianBasinRegions[regionIndex];

  // Distribute around Indian field center with local offset
  const latOffset = (seededNumber(wellNumber * 17) - 0.5) * 0.18;
  const lngOffset = (seededNumber(wellNumber * 31) - 0.5) * 0.18;

  const lat = Math.round((region.lat + latOffset) * 10000) / 10000;
  const lng = Math.round((region.lng + lngOffset) * 10000) / 10000;

  const fmt = formations[Math.floor(seededNumber(wellNumber * 43) * formations.length)];

  // Status breakdown: ~70% Completed, ~15% Drilling, ~15% Abandoned
  const statusRoll = seededNumber(wellNumber * 47);
  let status = "Completed";
  if (statusRoll > 0.85) status = "Drilling";
  else if (statusRoll > 0.70) status = "Abandoned";

  // Depth range: 2200m to 4400m
  const totalDepth = Math.round(2200 + seededNumber(wellNumber * 59) * 2100);

  const wellId = `WELL-${padNum}`;
  const name = `NWIS Demo Well ${wellNumber} (${region.field})`;

  return {
    wellId,
    name,
    latitude: lat,
    longitude: lng,
    totalDepth,
    formation: fmt,
    status,
  };
});

// All 100 Indian Wells
export const all100Wells = [...existingWells, ...syntheticWells];

const realisticEvents = [
  {
    type: "Mud Loss",
    severity: "High",
    desc: "Severe lost circulation (35 bbl/hr) across permeable sandstone interval.",
    mit: "Pumped 40 bbl coarse calcium carbonate LCM pill and lowered circulation rate.",
  },
  {
    type: "Stuck Pipe",
    severity: "Medium",
    desc: "Differential sticking during connection break across reactive shale section.",
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
    desc: "Drag observed on tripping out at casing shoe transition boundary.",
    mit: "Back-reamed interval with 80 RPM and conditioned borehole.",
  },
];

async function main() {
  console.log("🇮🇳 Starting NWIS 100-Well Pan-India Demo Seed...");
  await client.connect();
  console.log("✅ Connected to Neon PostgreSQL");

  // Step 1: Insert or update all 100 India-located wells
  console.log(`Inserting/updating ${all100Wells.length} wells across India...`);
  for (const well of all100Wells) {
    await client.query(
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
        "updatedAt" = NOW();
      `,
      [
        well.wellId,
        well.name,
        well.latitude,
        well.longitude,
        well.totalDepth,
        well.formation,
        well.status,
      ]
    );
  }

  // Verify wells count
  const countRes = await client.query('SELECT count(*) FROM "well";');
  const count = parseInt(countRes.rows[0].count, 10);
  console.log(`📊 Total wells in database: ${count}`);

  // Step 2: Clear old events & drilling parameters to re-populate full telemetry for all 100 wells
  console.log("Syncing drilling parameters and historical incidents for all 100 wells...");
  await client.query('DELETE FROM "drillingParameter";');
  await client.query('DELETE FROM "wellEvent";');

  const wellsRes = await client.query('SELECT "id", "wellId", "totalDepth", "formation" FROM "well" ORDER BY "id" ASC;');
  const dbWells = wellsRes.rows;

  // Batch insert parameters in chunks of 20 wells to prevent statement limit
  const CHUNK_SIZE = 20;
  for (let c = 0; c < dbWells.length; c += CHUNK_SIZE) {
    const chunk = dbWells.slice(c, c + CHUNK_SIZE);
    const paramValues: any[] = [];
    const paramPlaceholders: string[] = [];
    let paramCounter = 1;

    const eventValues: any[] = [];
    const eventPlaceholders: string[] = [];
    let eventCounter = 1;

    for (const well of chunk) {
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

      // 1-2 realistic events per well
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

    if (paramPlaceholders.length > 0) {
      await client.query(
        `INSERT INTO "drillingParameter" ("depth", "rop", "wob", "rpm", "torque", "mudWeight", "pressure", "wellId", "recordedAt") VALUES ${paramPlaceholders.join(", ")};`,
        paramValues
      );
    }

    if (eventPlaceholders.length > 0) {
      await client.query(
        `INSERT INTO "wellEvent" ("eventType", "startDepth", "endDepth", "severity", "description", "mitigation", "wellId", "createdAt") VALUES ${eventPlaceholders.join(", ")};`,
        eventValues
      );
    }
  }

  const finalParams = await client.query('SELECT count(*) FROM "drillingParameter";');
  const finalEvents = await client.query('SELECT count(*) FROM "wellEvent";');

  console.log(`✅ Seed complete: ${count} wells across India, ${finalParams.rows[0].count} drilling parameters, ${finalEvents.rows[0].count} events.`);
  await client.end();
}

main().catch(async (e) => {
  console.error("❌ Seed failed:", e);
  await client.end();
  process.exit(1);
});

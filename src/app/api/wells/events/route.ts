import { NextResponse } from "next/server";
import { db } from "@/prisma/db";

export async function GET() {
  try {
    const [events, wells] = await Promise.all([
      db.orm.public.WellEvent.where({}).all(),
      db.orm.public.Well.where({}).all(),
    ]);

    const wellsById = new Map(wells.map((well) => [well.id, well]));
    const eventsWithWells = events.map((event) => ({
      ...event,
      well: wellsById.get(event.wellId),
    }));

    return NextResponse.json(eventsWithWells);
  } catch (error) {
    console.error("WELL EVENTS API ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch well events",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

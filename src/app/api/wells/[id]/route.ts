import { NextResponse } from "next/server";
import { db } from "@/prisma/db";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await props.params;

    // Support both numeric id (e.g. 1) and wellId string (e.g. WELL-001)
    let well = null;
    const numId = parseInt(paramId, 10);

    if (!isNaN(numId)) {
      well = await db.orm.public.Well.where({ id: numId }).first();
    }

    if (!well) {
      well = await db.orm.public.Well.where({ wellId: paramId }).first();
    }

    if (!well) {
      return NextResponse.json({ error: "Well not found" }, { status: 404 });
    }

    // Fetch related events and drilling parameters
    const [events, parameters] = await Promise.all([
      db.orm.public.WellEvent.where({ wellId: well.id }).all(),
      db.orm.public.DrillingParameter.where({ wellId: well.id }).all(),
    ]);

    return NextResponse.json({
      ...well,
      events,
      parameters,
    });
  } catch (error) {
    console.error("WELL DETAIL API ERROR:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch well details",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { db } from "@/prisma/db";

export async function GET() {
  try {
    const wells = await db.orm.public.Well.where({}).all();

    return NextResponse.json(wells);
  } catch (error) {
    console.error("WELLS API ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch wells",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

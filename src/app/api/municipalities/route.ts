import { NextResponse } from "next/server";
import { loadMunicityBoundaries } from "@/app/lib/loadMunicityBoundaries";

export async function GET() {
    try {
        const municipalityData = await loadMunicityBoundaries();
        return NextResponse.json(municipalityData);
    } catch (error) {
        console.error("Error loading municipality data:", error);
        return NextResponse.json(
            { error: "Failed to load municipality data" },
            { status: 500 }
        );
    }
}

import { loadProvinceData } from "@/app/lib/loadProvinceBoundaries";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const data = await loadProvinceData();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error loading province data:", error);
        return NextResponse.json(
            { error: "Failed to load province data" },
            { status: 500 }
        );
    }
}

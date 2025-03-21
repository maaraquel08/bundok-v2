import { NextResponse } from "next/server";
import { loadProvinceData } from "@/app/lib/loadProvinceBoundaries";

export async function GET() {
    try {
        console.log("Loading province data...");
        const data = await loadProvinceData();

        if (!data.boundaries || !data.mountains) {
            console.error("No province data loaded");
            return NextResponse.json(
                { error: "Failed to load province data" },
                { status: 404 }
            );
        }

        console.log(
            `Loaded ${data.boundaries.features.length} boundaries and ${data.mountains.features.length} mountains`
        );

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in boundaries API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const prerender = false;

import { NextResponse } from "next/server";
import { loadProvinceData } from "@/app/lib/loadProvinceBoundaries";

export async function GET() {
    try {
        const data = await loadProvinceData();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in provinces API route:", error);
        return NextResponse.json(
            { error: "Failed to load province data" },
            { status: 500 }
        );
    }
}

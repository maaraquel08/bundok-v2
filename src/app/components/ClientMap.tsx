"use client";

import dynamic from "next/dynamic";

// Create a dynamic import for the Map component with SSR disabled
const DynamicMap = dynamic(() => import("./Map").then((mod) => mod.Map), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center min-h-[90vh]">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
        </div>
    ),
});

export function ClientMap() {
    return (
        <div className="relative w-full h-full min-h-[90vh]">
            <DynamicMap />
        </div>
    );
}

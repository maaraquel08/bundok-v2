"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";

// Define the ProvinceInfo type
interface ProvinceInfo {
    name: string;
    id: string | number;
}

// Create a dynamic import for the Map component with SSR disabled
const DynamicMap = dynamic(() => import("./Map").then((mod) => mod.Map), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
        </div>
    ),
});

export function ClientMap() {
    // Lift state up to this component
    const [selectedProvince, setSelectedProvince] =
        useState<ProvinceInfo | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    // Handle province selection
    const handleProvinceSelect = useCallback(
        (province: ProvinceInfo | null) => {
            setSelectedProvince(province);
            setSheetOpen(province !== null);
        },
        []
    );

    // Handle sheet close
    const handleSheetClose = useCallback(() => {
        setSheetOpen(false);
        setSelectedProvince(null);
    }, []);

    return (
        <div className="relative w-full h-full">
            <DynamicMap
                onProvinceSelect={handleProvinceSelect}
                selectedProvince={selectedProvince}
            />

            {sheetOpen && selectedProvince && (
                <div
                    className="absolute top-0 right-0 h-full w-80 bg-white shadow-lg p-4 transition-all duration-300 ease-in-out transform translate-x-0"
                    style={{
                        zIndex: 10,
                        borderLeft: "1px solid #e2e8f0",
                    }}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">
                            {selectedProvince.name}
                        </h2>
                        <button
                            onClick={handleSheetClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="mt-4">
                        {/* Content for the province details */}
                    </div>
                </div>
            )}
        </div>
    );
}

import fs from "fs";
import path from "path";
import { GeoJSONCollection } from "@/app/types/geojson";

const GEOJSON_DIR = path.join(
    process.cwd(),
    "data/ph-boundaries/2023/geojson/provdists/hires"
);

export interface MunicipalityData {
    [provinceCode: string]: GeoJSONCollection;
}

export async function loadMunicityBoundaries(): Promise<MunicipalityData> {
    try {
        const municipalitiesByProvince: MunicipalityData = {};
        const files = fs.readdirSync(GEOJSON_DIR);

        for (const file of files) {
            if (!file.endsWith(".json")) continue;

            // Extract province code from filename (e.g., municities-provdist-102800000.0.01.json)
            const provinceCode = file.split("-")[2].split(".")[0];
            const filePath = path.join(GEOJSON_DIR, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const data = JSON.parse(content) as GeoJSONCollection;

            if (data.features && Array.isArray(data.features)) {
                municipalitiesByProvince[provinceCode] = data;
            }
        }

        return municipalitiesByProvince;
    } catch (error) {
        console.error("Error loading municipality boundaries:", error);
        throw error;
    }
}

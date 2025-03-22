import fs from "fs";
import path from "path";
import { GeoJSONCollection } from "@/app/types/geojson";

const BOUNDARIES_DIR = path.join(
    process.cwd(),
    "data/boundaries-data/2023/geojson/regions/hires"
);

const MOUNTAINS_DIR = path.join(
    process.cwd(),
    "data/mountains-data/data/geojson/province"
);

export interface Mountain {
    name: string;
    elev: number;
    prom: number;
    coord: string;
    prov: string[];
    region: string[];
    isl_grp: string;
    alt_names: string[];
}

export interface ProvinceData {
    boundaries: GeoJSONCollection | null;
    mountains: GeoJSONCollection | null;
}

export async function loadProvinceData(): Promise<ProvinceData> {
    try {
        // Load province boundaries from region files
        const boundariesCollection: GeoJSONCollection = {
            type: "FeatureCollection",
            features: [],
        };

        // Check if directories exist
        if (!fs.existsSync(BOUNDARIES_DIR)) {
            console.error(`Boundaries directory not found: ${BOUNDARIES_DIR}`);
            throw new Error("Boundaries directory not found");
        }

        if (!fs.existsSync(MOUNTAINS_DIR)) {
            console.error(`Mountains directory not found: ${MOUNTAINS_DIR}`);
            throw new Error("Mountains directory not found");
        }

        const boundaryFiles = fs.readdirSync(BOUNDARIES_DIR);
        console.log("Found region boundary files:", boundaryFiles);

        for (const file of boundaryFiles) {
            if (!file.endsWith(".json")) continue;

            const filePath = path.join(BOUNDARIES_DIR, file);
            console.log("Reading region boundary file:", filePath);

            const content = fs.readFileSync(filePath, "utf-8");
            const data = JSON.parse(content) as GeoJSONCollection;

            if (data.features && Array.isArray(data.features)) {
                // Each feature in the region file is a province
                boundariesCollection.features.push(...data.features);
            }
        }

        // Load mountain data
        const mountainsCollection: GeoJSONCollection = {
            type: "FeatureCollection",
            features: [],
        };

        const mountainFiles = fs.readdirSync(MOUNTAINS_DIR);
        console.log("Found mountain files:", mountainFiles);

        for (const file of mountainFiles) {
            if (!file.endsWith(".geojson")) continue;

            const filePath = path.join(MOUNTAINS_DIR, file);
            console.log("Reading mountain file:", filePath);

            const content = fs.readFileSync(filePath, "utf-8");
            const data = JSON.parse(content) as GeoJSONCollection;

            if (data.features && Array.isArray(data.features)) {
                mountainsCollection.features.push(...data.features);
            }
        }

        console.log(
            `Loaded ${boundariesCollection.features.length} province boundaries from regions`
        );
        console.log(`Loaded ${mountainsCollection.features.length} mountains`);

        return {
            boundaries: boundariesCollection,
            mountains: mountainsCollection,
        };
    } catch (error) {
        console.error("Error loading province data:", error);
        throw error; // Let the API handle the error
    }
}

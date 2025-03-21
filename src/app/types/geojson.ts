import { Feature, Geometry } from "geojson";

export type GeoJSONFeature = Feature;

export interface GeoJSONCollection {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
}

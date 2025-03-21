"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Geometry, Point, Feature } from "geojson";
// Import specific types from Leaflet to fix type issues
import L, { GeoJSON, LeafletEvent, PathOptions } from "leaflet";
// Import the core Leaflet CSS first
import "leaflet/dist/leaflet.css";
// Then import our custom CSS to override as needed
import "../styles/leaflet.css";
// Import SheetPanel component
import { SheetPanel } from "./SheetPanel";
// Import Zustand store
import useClimbedMountainsStore from "@/store/useClimbedMountainsStore";

interface MapProps {
    initialCenter?: [number, number];
    initialZoom?: number;
}

interface MountainProperties {
    id?: string;
    name?: string;
    elevation?: number;
    elev?: number;
    prom?: number;
    prov?: string[];
    region?: string[];
    isl_grp?: string;
    alt_names?: string[];
    [key: string]: unknown;
}

// Define a GeoJSON feature type for provinces
interface ProvinceFeature {
    type: string;
    id?: string | number;
    properties: ProvinceProperties;
    geometry: Geometry;
}

interface ProvinceProperties {
    id?: string;
    name?: string;
    adm2_en?: string;
    mountainCount?: number;
    [key: string]: unknown;
}

export interface ProvinceInfo {
    name: string;
    id: string | number;
}

export function Map({
    initialCenter = [20, 132], // Default to Manila coordinates (lat, lng for Leaflet)
    initialZoom = 6,
}: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const mapInitializedRef = useRef(false);
    const selectedProvinceIdRef = useRef<string | number | null>(null);
    const provincesLayerRef = useRef<L.GeoJSON | null>(null);
    const visibleMountainsLayerRef = useRef<L.GeoJSON | null>(null);
    // Add ref to track mountain labels
    const mountainLabelsRef = useRef<L.Marker[]>([]);
    // Mountains data is used indirectly through the calculateMountainCountsByProvince function
    // which is called in fetchData and stores mountains in mountainsByProvinceRef
    const [mountains, setMountains] = useState<FeatureCollection<
        Point,
        MountainProperties
    > | null>(null);
    // Add a ref to store mountains grouped by province
    const mountainsByProvinceRef = useRef<Record<string, GeoJSON.Feature[]>>(
        {}
    );

    // Add state for the detail panel
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedProvince, setSelectedProvince] = useState<{
        name: string;
        mountainCount: number;
    } | null>(null);

    // Replace the local state with Zustand store
    const { climbedMountains, toggleMountain } = useClimbedMountainsStore();

    const resetHighlight = (e: LeafletEvent) => {
        // Only reset highlight if this province is not the selected one
        if (
            provincesLayerRef.current &&
            e.target.feature &&
            e.target.feature.id !== selectedProvinceIdRef.current
        ) {
            const layer = e.target as L.Path;
            // If there's a selected province, non-selected provinces should return to faded state
            if (selectedProvinceIdRef.current !== null) {
                layer.setStyle(
                    getProvinceStyle(
                        e.target.feature as unknown as ProvinceFeature,
                        false,
                        true
                    )
                );
            } else {
                // Otherwise, reset to normal style
                provincesLayerRef.current.resetStyle(layer);
            }
        }
        // No style change for selected province when mouse leaves
    };

    const highlightFeature = (e: LeafletEvent) => {
        const layer = e.target as L.Path;
        if (!layer) return;

        // Don't change the style if this is the currently selected province
        if (
            e.target.feature &&
            e.target.feature.id === selectedProvinceIdRef.current
        ) {
            return; // Early exit - no hover effect for selected province
        }

        // Apply hover style (slightly different based on whether there's a selected province)
        layer.setStyle({
            weight: 3,
            opacity: 1.0,
            color: "#627BC1", // Blue hover color
            dashArray: "",
            // If there's a selected province and this isn't it, keep reduced opacity
            fillOpacity: selectedProvinceIdRef.current !== null ? 0.5 : 0.7,
        });

        layer.bringToFront();

        // If there's a selected province, make sure it stays on top
        if (
            selectedProvinceIdRef.current !== null &&
            provincesLayerRef.current
        ) {
            provincesLayerRef.current.eachLayer((l: L.Layer) => {
                if (l instanceof L.Path) {
                    // Need to cast to access feature property
                    const pathLayer = l as unknown as {
                        feature?: { id?: string | number };
                    };
                    if (
                        pathLayer.feature &&
                        pathLayer.feature.id === selectedProvinceIdRef.current
                    ) {
                        l.bringToFront();
                    }
                }
            });
        }
    };

    const getProvinceStyle = (
        feature: ProvinceFeature,
        isSelected: boolean,
        isFaded: boolean = false
    ): PathOptions => {
        const mountainCount = feature.properties?.mountainCount || 0;

        // Determine fill color based on mountain count
        let fillColor = "#EAEAEA"; // Default color
        if (mountainCount >= 25) fillColor = "#006D2C";
        else if (mountainCount >= 20) fillColor = "#238B45";
        else if (mountainCount >= 15) fillColor = "#41AB5D";
        else if (mountainCount >= 10) fillColor = "#74C476";
        else if (mountainCount >= 5) fillColor = "#A1D99B";
        else if (mountainCount >= 3) fillColor = "#C7E9C0";
        else if (mountainCount >= 1) fillColor = "#E5F5E0";

        return {
            fillColor: fillColor,
            weight: isSelected ? 3 : 1,
            opacity: 1,
            color: isSelected ? "#ff8787" : "#627BC1",
            dashArray: isSelected ? "4, 2" : "",
            fillOpacity: isFaded ? 0.3 : 0.8,
        };
    };

    const onEachProvince = (feature: ProvinceFeature, layer: L.Layer) => {
        if (!(layer instanceof L.Path)) return;

        const provinceName =
            feature.properties?.name ||
            feature.properties?.adm2_en ||
            "Unknown Province";
        const mountainCount = feature.properties?.mountainCount || 0;

        // Add popups
        layer.bindTooltip(
            `<div style="padding: 12px; font-family: system-ui, sans-serif; line-height: 1.4; overflow:hidden; border-radius: 8px; border: 1px solid #D9DEDE; background: rgba(255, 255, 255, 0.5); box-shadow: 0px 2px 8px -2px rgba(0, 0, 0, 0.20); backdrop-filter: blur(32px); min-width: 180px; transform: translateY(-5px);">
                <strong style="font-size: 1.2em; color: #17ad49; display: block; margin-bottom: 8px;">${provinceName}</strong>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: 600; color: #5D6C6B;">Mountains:</span>
                    <span style="color: #262B2B; font-weight: bold;">${mountainCount}</span>
                </div>
            </div>`,
            {
                direction: "top",
                offset: L.point(0, -10),
                opacity: 1,
                className: "province-info-tooltip",
            }
        );

        // Add event listeners
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: () => {
                // Get province ID for highlighting
                const provinceId = feature.id ?? null;
                const provinceName =
                    feature.properties?.name ||
                    feature.properties?.adm2_en ||
                    "Unknown Province";

                console.log(
                    `Clicked on province: ${provinceName} (ID: ${provinceId})`
                );

                // If clicking the same province, deselect it
                if (provinceId === selectedProvinceIdRef.current) {
                    console.log(`Deselecting province: ${provinceName}`);
                    selectedProvinceIdRef.current = null;

                    // Reset all provinces to normal opacity
                    if (provincesLayerRef.current) {
                        provincesLayerRef.current.eachLayer(
                            (layer: L.Layer) => {
                                if (layer instanceof L.Path) {
                                    provincesLayerRef.current?.resetStyle(
                                        layer
                                    );

                                    // Defer tooltip rebinding to avoid conflicts with current click event
                                    setTimeout(() => {
                                        // Re-enable tooltip for this province
                                        const pathLayer = layer as L.Path & {
                                            feature?: ProvinceFeature;
                                        };

                                        if (pathLayer.feature) {
                                            const provinceName =
                                                pathLayer.feature.properties
                                                    ?.name ||
                                                pathLayer.feature.properties
                                                    ?.adm2_en ||
                                                "Unknown Province";
                                            const mountainCount =
                                                pathLayer.feature.properties
                                                    ?.mountainCount || 0;

                                            // Re-add tooltip with the same content as in onEachProvince
                                            layer.bindTooltip(
                                                `<div style="padding: 12px; font-family: system-ui, sans-serif; line-height: 1.4; overflow:hidden; border-radius: 8px; border: 1px solid #D9DEDE; background: rgba(255, 255, 255, 0.5); box-shadow: 0px 2px 8px -2px rgba(0, 0, 0, 0.20); backdrop-filter: blur(32px); min-width: 180px; transform: translateY(-5px);">
                                                <strong style="font-size: 1.2em; color: #17ad49; display: block; margin-bottom: 8px;">${provinceName}</strong>
                                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                                    <span style="font-weight: 600; color: #5D6C6B;">Mountains:</span>
                                                    <span style="color: #262B2B; font-weight: bold;">${mountainCount}</span>
                                                </div>
                                            </div>`,
                                                {
                                                    direction: "top",
                                                    offset: L.point(0, -10),
                                                    opacity: 1,
                                                    className:
                                                        "province-info-tooltip",
                                                }
                                            );
                                        }
                                    }, 10); // Short timeout to let the click event resolve
                                }
                            }
                        );
                    }

                    // Clear mountains layer
                    if (visibleMountainsLayerRef.current && map.current) {
                        map.current.removeLayer(
                            visibleMountainsLayerRef.current
                        );
                        visibleMountainsLayerRef.current = null;
                    }

                    // Clear mountain labels
                    clearMountainLabels();

                    // Close the sheet panel
                    setIsPanelOpen(false);
                    setSelectedProvince(null);

                    return;
                }

                console.log(`Selecting province: ${provinceName}`);

                // Update the selected province ID
                selectedProvinceIdRef.current = provinceId;

                // Update the selected province data and open the panel
                setSelectedProvince({
                    name: provinceName,
                    mountainCount: feature.properties?.mountainCount || 0,
                });
                setIsPanelOpen(true);

                // Apply selected style to the clicked province and fade others
                if (provincesLayerRef.current) {
                    // Apply faded style to all provinces
                    provincesLayerRef.current.eachLayer((layer: L.Layer) => {
                        if (layer instanceof L.Path) {
                            const pathLayer = layer as L.Path & {
                                feature?: ProvinceFeature;
                            };
                            const featureId = pathLayer.feature?.id;

                            if (featureId !== provinceId) {
                                // Apply faded style to non-selected provinces
                                layer.setStyle(
                                    getProvinceStyle(
                                        pathLayer.feature as ProvinceFeature,
                                        false,
                                        true
                                    )
                                );
                            } else {
                                // Apply selected style to clicked province
                                layer.setStyle(
                                    getProvinceStyle(
                                        pathLayer.feature as ProvinceFeature,
                                        true,
                                        false
                                    )
                                );
                                layer.bringToFront();

                                // Disable tooltip for the selected province
                                layer.unbindTooltip();
                            }
                        }
                    });
                }

                // Display mountains in this province
                console.log(
                    `Calling displayMountainsInProvince for: ${provinceName}`
                );
                displayMountainsInProvince(provinceName);
            },
        });
    };

    const displayMountainsInProvince = (provinceName: string) => {
        console.log(
            `Inside displayMountainsInProvince function for: ${provinceName}`
        );

        if (!map.current) {
            console.error("Map not initialized");
            return;
        }

        // Remove existing mountains layer
        if (visibleMountainsLayerRef.current) {
            console.log("Removing existing mountains layer");
            map.current.removeLayer(visibleMountainsLayerRef.current);
            visibleMountainsLayerRef.current = null;
        }

        // Clear any existing mountain labels
        clearMountainLabels();

        // Use mountains from our province-indexed collection
        const provinceMountains =
            mountainsByProvinceRef.current[provinceName.toLowerCase()] || [];

        console.group(`Mountains in ${provinceName}`);
        console.log(
            `Found ${provinceMountains.length} mountains in pre-indexed collection`
        );

        if (provinceMountains.length > 0) {
            console.table(
                provinceMountains.map((mountain) => {
                    // Safely access coordinates with type checking
                    const coordinates =
                        mountain.geometry.type === "Point" &&
                        "coordinates" in mountain.geometry
                            ? [
                                  mountain.geometry.coordinates[1],
                                  mountain.geometry.coordinates[0],
                              ]
                            : ["unknown", "unknown"];

                    return {
                        name: mountain.properties?.name || "Unnamed",
                        elevation:
                            mountain.properties?.elevation ||
                            mountain.properties?.elev ||
                            "Unknown",
                        coordinates: coordinates,
                        province: Array.isArray(mountain.properties?.prov)
                            ? mountain.properties?.prov.join(", ")
                            : "Unknown",
                    };
                })
            );
        } else {
            console.log("No mountains found in this province");
        }
        console.groupEnd();

        if (provinceMountains.length === 0) {
            console.log(`No mountains found for province: ${provinceName}`);
            return;
        }

        console.log(
            `Creating GeoJSON for ${provinceMountains.length} mountains`
        );

        // Create a GeoJSON collection for the mountains
        const provinceMountainsGeoJSON: FeatureCollection<
            Point,
            MountainProperties
        > = {
            type: "FeatureCollection",
            features: provinceMountains as unknown as Feature<
                Point,
                MountainProperties
            >[], // Type cast with unknown intermediary
        };

        // Add mountains as simple circle markers that automatically scale with zoom
        visibleMountainsLayerRef.current = L.geoJSON(provinceMountainsGeoJSON, {
            pointToLayer: (feature: GeoJSON.Feature, latlng: L.LatLng) => {
                const props = feature.properties as MountainProperties;
                const name = props?.name || "Unnamed Mountain";
                // Make sure we're using the actual ID from properties that was assigned in calculateMountainCountsByProvince
                const mountainId = props.id || `${name}-fallback`;
                const isClimbed = climbedMountains[mountainId] || false;

                // Create a div icon for the mountain marker for better styling control
                const mountainIcon = L.divIcon({
                    className: "mountain-icon", // Use custom class
                    html: `<div class="mountain-marker" style="
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background-color: ${isClimbed ? "#22c55e" : "#d62828"};
                        border: 2px solid white;
                        box-shadow: 0 0 4px rgba(0,0,0,0.3);
                    "></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                });

                // Use a marker with our custom icon instead of circleMarker
                const marker = L.marker(latlng, {
                    icon: mountainIcon,
                    interactive: true,
                    bubblingMouseEvents: false, // Prevent event bubbling
                    riseOnHover: true, // Bring to front when hovered
                });

                // Get current zoom level for label visibility
                const currentZoom = map.current?.getZoom() || 0;
                const showLabel = currentZoom > 5; // Only show labels when zoomed in enough

                // Add popup with detailed information on click
                const elevation = props?.elevation || props?.elev;
                const prominence = props?.prom;
                const region = props?.region;
                const provinceArr = props?.prov;

                // Format regions and provinces for display
                const regionText = Array.isArray(region)
                    ? region.join(", ")
                    : typeof region === "string"
                    ? region
                    : "";
                const provinceText = Array.isArray(provinceArr)
                    ? provinceArr.join(", ")
                    : typeof provinceArr === "string"
                    ? provinceArr
                    : "";

                // Create enhanced hover tooltip content
                const infoTooltipContent = `
                    <div style="padding: 12px; font-family: system-ui, sans-serif; line-height: 1.4; overflow:hidden; border-radius: 8px; border: 1px solid rgba(217, 222, 222, 0.4); background: rgba(255, 255, 255, 0.50); box-shadow: 0px 2px 8px -2px rgba(0, 0, 0, 0.20); backdrop-filter: blur(32px); color: white; min-width: 220px; transform: translateY(-5px);">
                        <strong style="font-size: 1.2em; color: #DA2F38; display: block; margin-bottom: 8px;">${name}</strong>
                        ${
                            elevation
                                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #5D6C6B;;">Elevation:</span> <span style="color: #262B2B; font-weight: bold;">${elevation}m</span></div>`
                                : ""
                        }
                        ${
                            prominence
                                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #5D6C6B;">Prominence:</span> <span style="color: #262B2B; font-weight: bold;">${prominence}m</span></div>`
                                : ""
                        }
                        ${
                            provinceText
                                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #5D6C6B;">Province:</span> <span style="color: #262B2B; font-weight: bold;">${provinceText}</span></div>`
                                : ""
                        }
                        ${
                            regionText
                                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #5D6C6B;">Region:</span> <span style="color: #262B2B; font-weight: bold;">${regionText}</span></div>`
                                : ""
                        }
                    </div>
                `;

                // Bind enhanced tooltip to show on hover
                marker.bindTooltip(infoTooltipContent, {
                    direction: "top",
                    className: "mountain-info-tooltip",
                    opacity: 1,
                    offset: [0, -5],
                });

                // Add the mountain name as a permanent label if zoomed in enough
                if (map.current && showLabel) {
                    const nameLabel = L.divIcon({
                        className: "mountain-name-label",
                        html: `<div>${name}</div>`,
                        iconSize: [100, 20],
                        iconAnchor: [50, -8],
                    });

                    // Create a separate marker just for the label and track it
                    const labelMarker = L.marker(latlng, {
                        icon: nameLabel,
                        interactive: false, // Don't capture mouse events
                        keyboard: false,
                    }).addTo(map.current);

                    // Track the label marker for future removal
                    mountainLabelsRef.current.push(labelMarker);
                }

                return marker;
            },
        }).addTo(map.current);

        // Add zoom handler to handle label visibility
        const updateLabelVisibility = () => {
            if (!map.current || !visibleMountainsLayerRef.current) return;

            // Clear existing labels before re-displaying
            clearMountainLabels();

            // Simply refresh the current display by redisplaying the province
            if (provinceName) {
                displayMountainsInProvince(provinceName);
            }
        };

        // Add zoom listener for label visibility
        map.current.on("zoomend", updateLabelVisibility);
    };

    // Add helper function to clear mountain labels
    const clearMountainLabels = () => {
        if (map.current && mountainLabelsRef.current.length > 0) {
            mountainLabelsRef.current.forEach((label) => {
                if (map.current) {
                    map.current.removeLayer(label);
                }
            });
            mountainLabelsRef.current = [];
        }
    };

    const calculateMountainCountsByProvince = (
        boundaries: FeatureCollection<Geometry, ProvinceProperties>,
        mountains: FeatureCollection<Point, MountainProperties>
    ): Record<string, number> => {
        const counts: Record<string, number> = {};
        const provinceNameMap: Record<string, string> = {};
        // Add a map to collect mountains by province
        const mountainsByProvince: Record<string, GeoJSON.Feature[]> = {};

        // Initialize all provinces with 0 mountains and collect province names
        boundaries.features.forEach((province) => {
            const provinceName = province.properties?.name;
            const provinceAltName = province.properties?.adm2_en;

            if (provinceName && typeof provinceName === "string") {
                counts[provinceName] = 0;
                const normalizedName = provinceName.toLowerCase().trim();
                provinceNameMap[normalizedName] = provinceName;
                mountainsByProvince[normalizedName] = [];
            }

            if (
                provinceAltName &&
                typeof provinceAltName === "string" &&
                provinceAltName !== provinceName
            ) {
                counts[provinceAltName] = 0;
                const normalizedAltName = provinceAltName.toLowerCase().trim();
                provinceNameMap[normalizedAltName] = provinceAltName;
                mountainsByProvince[normalizedAltName] = [];
            }
        });

        // Count mountains for each province based on the 'prov' property
        let uniqueCounter = 0; // Add a counter for generating truly unique IDs
        mountains.features.forEach((mountain) => {
            const provArray = mountain.properties?.prov;

            // Ensure each mountain has a stable ID
            if (mountain.properties && !mountain.properties.id) {
                // Add uniqueCounter to ensure uniqueness even if name and coordinates are identical
                mountain.properties.id = `mountain-${
                    mountain.properties.name
                }-${mountain.geometry.coordinates[0]}-${
                    mountain.geometry.coordinates[1]
                }-${uniqueCounter++}`;
            }

            if (!Array.isArray(provArray)) return;

            provArray.forEach((provinceName) => {
                if (provinceName && typeof provinceName === "string") {
                    const provinceNameLower = provinceName.toLowerCase().trim();
                    let addedToProvince = false;

                    // Try direct match
                    if (counts.hasOwnProperty(provinceName)) {
                        counts[provinceName]++;
                        mountainsByProvince[provinceNameLower].push(mountain);
                        addedToProvince = true;
                    }

                    // Try normalized map
                    if (
                        !addedToProvince &&
                        provinceNameMap[provinceNameLower]
                    ) {
                        const mappedName = provinceNameMap[provinceNameLower];
                        counts[mappedName]++;
                        mountainsByProvince[provinceNameLower].push(mountain);
                        addedToProvince = true;
                    }

                    // Try case-insensitive match
                    if (!addedToProvince) {
                        for (const existingProvince in counts) {
                            const existingLower =
                                existingProvince.toLowerCase();
                            if (existingLower === provinceNameLower) {
                                counts[existingProvince]++;
                                mountainsByProvince[existingLower].push(
                                    mountain
                                );
                                addedToProvince = true;
                                break;
                            }

                            if (
                                existingLower.includes(provinceNameLower) ||
                                provinceNameLower.includes(existingLower)
                            ) {
                                counts[existingProvince]++;
                                mountainsByProvince[existingLower].push(
                                    mountain
                                );
                                addedToProvince = true;
                                break;
                            }
                        }
                    }
                }
            });
        });

        // Store the mountains by province in the ref for later use
        mountainsByProvinceRef.current = mountainsByProvince;
        return counts;
    };

    useEffect(() => {
        // Prevent re-initialization if the map is already created
        if (mapInitializedRef.current && map.current) {
            return;
        }

        if (!mapContainer.current) {
            console.error("Map container not found");
            return;
        }

        console.log("Initializing map"); // Debug log

        // Fix for Leaflet icon issues in Next.js
        const fixLeafletIcon = () => {
            // @ts-expect-error - accessing default object properties
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl:
                    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl:
                    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl:
                    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });
        };

        fixLeafletIcon();

        // Initialize the map with navigation controls
        map.current = L.map(mapContainer.current, {
            zoomControl: true, // Enable default zoom controls
            minZoom: 3, // Lower min zoom to allow seeing more context
            // Remove maxBounds to allow free panning anywhere on the map
        }).setView(initialCenter, initialZoom);

        // Mark as initialized early
        mapInitializedRef.current = true;

        // Add scale control to show map scale
        L.control
            .scale({
                imperial: false, // Only show metric scale
                position: "bottomleft",
            })
            .addTo(map.current);

        // Use a colorful tile layer with blue water and no labels
        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
            {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: "abcd",
                maxZoom: 20,
                className: "clean-tiles",
            }
        ).addTo(map.current);

        // Add a custom water style with blue color
        const waterStyle = `
            .leaflet-container {
                background-color: #b5d0d0 !important;
            }
        `;

        // Add the style to the document
        const styleElement = document.createElement("style");
        styleElement.textContent = waterStyle;
        document.head.appendChild(styleElement);

        // After map is initialized, fetch data
        const fetchData = async () => {
            try {
                const response = await fetch("/api/provinces");
                if (!response.ok) {
                    throw new Error("Failed to fetch province data");
                }

                const { boundaries, mountains } = (await response.json()) as {
                    boundaries: FeatureCollection<Geometry, ProvinceProperties>;
                    mountains: FeatureCollection<Point, MountainProperties>;
                };

                if (boundaries && mountains) {
                    // Calculate mountain counts per province
                    const mountainCountsByProvince =
                        calculateMountainCountsByProvince(
                            boundaries,
                            mountains
                        );

                    // Add mountain count property to each province feature
                    const boundariesWithMountainCounts: FeatureCollection<
                        Geometry,
                        ProvinceProperties
                    > = {
                        ...boundaries,
                        features: boundaries.features.map((feature) => {
                            const provinceName = feature.properties?.name;
                            const adm2Name = feature.properties?.adm2_en;

                            let mountainCount = 0;

                            if (
                                provinceName &&
                                typeof provinceName === "string"
                            ) {
                                mountainCount =
                                    mountainCountsByProvince[provinceName] || 0;
                            }

                            if (
                                mountainCount === 0 &&
                                adm2Name &&
                                typeof adm2Name === "string"
                            ) {
                                mountainCount =
                                    mountainCountsByProvince[adm2Name] || 0;
                            }

                            return {
                                ...feature,
                                properties: {
                                    ...feature.properties,
                                    mountainCount,
                                },
                            };
                        }),
                    };

                    // Store the boundaries data
                    setMountains(mountains);

                    // Add GeoJSON layer to map
                    if (map.current) {
                        if (provincesLayerRef.current) {
                            map.current.removeLayer(provincesLayerRef.current);
                        }

                        // Using type assertion to handle the complex types with GeoJSON
                        provincesLayerRef.current = L.geoJSON(
                            boundariesWithMountainCounts as GeoJSON.FeatureCollection,
                            {
                                style: (feature) => {
                                    // Safely cast the feature to our expected type
                                    return getProvinceStyle(
                                        feature as unknown as ProvinceFeature,
                                        false
                                    );
                                },
                                onEachFeature: (feature, layer) => {
                                    // Safely cast the parameters to the expected types
                                    onEachProvince(
                                        feature as unknown as ProvinceFeature,
                                        layer
                                    );
                                },
                            }
                        ).addTo(map.current);

                        // Fit bounds to the provinces layer
                        map.current.fitBounds(
                            provincesLayerRef.current.getBounds()
                        );
                    }
                }
            } catch (error) {
                console.error("Error loading province data:", error);
            }
        };

        fetchData();

        // Cleanup on unmount
        return () => {
            console.log("Cleaning up map"); // Debug log
            if (map.current) {
                // Remove any event listeners
                map.current.off("zoomend");
                map.current.remove();
                map.current = null;
                mapInitializedRef.current = false;
            }
            // Clear mountains data reference on unmount
            if (mountains) {
                setMountains(null);
            }
            // Clear mountain labels
            clearMountainLabels();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array to ensure effect runs only once

    return (
        <>
            {/* Map container */}
            <div
                ref={mapContainer}
                className="w-full h-full rounded-lg map-container"
                style={{
                    minHeight: "100vh",
                    width: "100%",
                    position: "relative",
                    zIndex: 1,
                    border: "2px solid #ccc", // Debug border
                }}
            />

            {/* Province details panel */}
            <SheetPanel
                isOpen={isPanelOpen}
                onClose={() => {
                    // When closing the panel, also deselect the province
                    if (selectedProvinceIdRef.current !== null) {
                        // Find the province layer and trigger a click to deselect it
                        if (provincesLayerRef.current) {
                            provincesLayerRef.current.eachLayer(
                                (layer: L.Layer) => {
                                    if (layer instanceof L.Path) {
                                        const pathLayer = layer as L.Path & {
                                            feature?: ProvinceFeature;
                                        };
                                        if (
                                            pathLayer.feature?.id ===
                                            selectedProvinceIdRef.current
                                        ) {
                                            // Simulate a click on the layer to deselect it
                                            // This will trigger our click handler which handles deselection
                                            layer.fire("click");
                                        }
                                    }
                                }
                            );
                        }
                    }
                }}
                title={selectedProvince?.name}
            >
                {selectedProvince && (
                    <div className="space-y-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="font-medium text-green-800 mb-2">
                                Province Statistics
                            </h3>
                            <div className="flex justify-between items-center">
                                <span className="text-green-700">
                                    Mountains I&apos;ve Climbed
                                </span>
                                <span className="font-bold text-green-900">
                                    {selectedProvince && selectedProvince.name
                                        ? mountainsByProvinceRef.current[
                                              selectedProvince.name.toLowerCase()
                                          ]?.reduce(
                                              (count, mountain, index) => {
                                                  const props =
                                                      mountain.properties as MountainProperties;
                                                  // Use consistent ID approach for all mountain references
                                                  const mountainId =
                                                      props.id ||
                                                      `${props.name}-${index}`;
                                                  return (
                                                      count +
                                                      (climbedMountains[
                                                          mountainId
                                                      ]
                                                          ? 1
                                                          : 0)
                                                  );
                                              },
                                              0
                                          ) || 0
                                        : 0}{" "}
                                    / {selectedProvince.mountainCount}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-gray-200 rounded-full">
                                <div
                                    className="h-full bg-green-500 rounded-full"
                                    style={{
                                        width: `${
                                            selectedProvince &&
                                            selectedProvince.name
                                                ? (
                                                      ((mountainsByProvinceRef.current[
                                                          selectedProvince.name.toLowerCase()
                                                      ]?.reduce(
                                                          (
                                                              count,
                                                              mountain,
                                                              index
                                                          ) => {
                                                              const props =
                                                                  mountain.properties as MountainProperties;
                                                              // Use consistent ID approach for all mountain references
                                                              const mountainId =
                                                                  props.id ||
                                                                  `${props.name}-${index}`;
                                                              return (
                                                                  count +
                                                                  (climbedMountains[
                                                                      mountainId
                                                                  ]
                                                                      ? 1
                                                                      : 0)
                                                              );
                                                          },
                                                          0
                                                      ) || 0) /
                                                          (selectedProvince.mountainCount ||
                                                              1)) *
                                                      100
                                                  ).toFixed(2)
                                                : 0
                                        }%`,
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Mountains list */}
                        {selectedProvince.name &&
                            mountainsByProvinceRef.current[
                                selectedProvince.name.toLowerCase()
                            ]?.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900">
                                        Mountains in {selectedProvince.name}
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        {mountainsByProvinceRef.current[
                                            selectedProvince.name.toLowerCase()
                                        ]?.map((mountain, index) => {
                                            const props =
                                                mountain.properties as MountainProperties;
                                            // Use a more stable ID - ensure it's unique across the entire app
                                            const mountainId =
                                                props.id ||
                                                `${props.name}-${index}`;
                                            const isChecked =
                                                climbedMountains[mountainId] ||
                                                false;

                                            return (
                                                <div
                                                    // Use the index in the key to guarantee uniqueness in this list
                                                    key={`${mountainId}-list-item-${index}`}
                                                    className={`p-3 border rounded-md border-gray-200 transition-opacity ${
                                                        isChecked
                                                            ? "opacity-50"
                                                            : ""
                                                    } cursor-pointer`}
                                                    onClick={() => {
                                                        toggleMountain(
                                                            mountainId
                                                        );
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`mountain-${index}`}
                                                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                e.stopPropagation(); // Prevent triggering the card click
                                                                toggleMountain(
                                                                    mountainId
                                                                );
                                                            }}
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            } // Prevent triggering the card click
                                                        />
                                                        <label
                                                            htmlFor={`mountain-${index}`}
                                                            className={`font-medium flex-1 ${
                                                                isChecked
                                                                    ? "text-gray-400 line-through"
                                                                    : "text-red-700"
                                                            }`}
                                                        >
                                                            {props.name ||
                                                                "Unnamed Mountain"}
                                                        </label>
                                                    </div>
                                                    <div className="flex flex-col gap-2 text-sm mt-2">
                                                        {(props.elevation ||
                                                            props.elev) && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">
                                                                    Elevation:
                                                                </span>
                                                                <span className="font-medium">
                                                                    {props.elevation ||
                                                                        props.elev}
                                                                    m
                                                                </span>
                                                            </div>
                                                        )}
                                                        {props.prom && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">
                                                                    Prominence:
                                                                </span>
                                                                <span className="font-medium">
                                                                    {props.prom}
                                                                    m
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                    </div>
                )}
            </SheetPanel>
        </>
    );
}

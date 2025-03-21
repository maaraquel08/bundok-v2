import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useEffect, useRef } from "react";
import type {
    FeatureCollection,
    Geometry,
    Point,
    Polygon,
    MultiPolygon,
} from "geojson";

// Extended Map interface to add our custom property
interface ExtendedMap extends maptilersdk.Map {
    _skipNextProvinceClick?: boolean;
}

interface MapProps {
    initialCenter?: [number, number];
    initialZoom?: number;
}

interface MountainProperties {
    id?: string;
    name?: string;
    elevation?: number;
    [key: string]: unknown;
}

interface ProvinceProperties {
    id?: string;
    name?: string;
    mountainCount?: number;
    [key: string]: unknown;
}

export function Map({
    initialCenter = [121.0244, 14.5547], // Default to Manila coordinates
    initialZoom = 12,
}: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maptilersdk.Map | null>(null);
    const mapInitializedRef = useRef(false);
    const clickHandlerRef = useRef<
        ((e: maptilersdk.MapLayerMouseEvent) => void) | null
    >(null);
    const selectedProvinceIdRef = useRef<string | number | null>(null);
    const boundariesRef = useRef<FeatureCollection<
        Geometry,
        ProvinceProperties
    > | null>(null);

    useEffect(() => {
        // Prevent re-initialization if the map is already created
        if (mapInitializedRef.current && map.current) {
            return;
        }

        if (!mapContainer.current) {
            console.error("Map container not found");
            return;
        }

        const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
        if (!apiKey) {
            console.error(
                "MapTiler API key is not defined in environment variables"
            );
            return;
        }

        let isMapLoaded = false;

        // Function to safely remove a layer if it exists
        const safelyRemoveLayer = (layerId: string) => {
            if (map.current && map.current.getLayer(layerId)) {
                map.current.removeLayer(layerId);
            }
        };

        // Function to safely remove all province-related layers in the correct order
        const safelyRemoveProvinceLayers = () => {
            if (!map.current) return;

            // Remove layers in the correct order
            safelyRemoveLayer("province-labels");
            safelyRemoveLayer("province-selected");
            safelyRemoveLayer("province-hover");
            safelyRemoveLayer("province-borders");
            safelyRemoveLayer("province-fills");
        };

        // Function to safely remove a source if it exists and has no dependent layers
        const safelyRemoveSource = (sourceId: string) => {
            if (!map.current) return;

            try {
                if (map.current.getSource(sourceId)) {
                    map.current.removeSource(sourceId);
                }
            } catch (error) {
                console.warn(`Could not remove source '${sourceId}':`, error);
            }
        };

        async function initializeMap() {
            try {
                // Configure the SDK with the API key
                maptilersdk.config.apiKey = apiKey as string;

                // Create the map instance with type assertion for container
                map.current = new maptilersdk.Map({
                    container: mapContainer.current as HTMLElement,
                    style: maptilersdk.MapStyle.DATAVIZ,
                    center: initialCenter,
                    zoom: initialZoom,
                });

                // Add error handling for map load
                map.current.on("error", (e) => {
                    console.error("Map error:", e);
                });

                // Load province data when map is ready
                map.current.on("load", async () => {
                    isMapLoaded = true;
                    mapInitializedRef.current = true;

                    try {
                        // Fetch province data from API
                        const response = await fetch("/api/provinces");
                        if (!response.ok) {
                            throw new Error("Failed to fetch province data");
                        }
                        const { boundaries, mountains } =
                            (await response.json()) as {
                                boundaries: FeatureCollection<
                                    Geometry,
                                    ProvinceProperties
                                >;
                                mountains: FeatureCollection<
                                    Point,
                                    MountainProperties
                                >;
                            };

                        if (boundaries && mountains && map.current) {
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
                                    // Try multiple property names to match with mountains data
                                    const provinceName =
                                        feature.properties?.name;
                                    const adm2Name =
                                        feature.properties?.adm2_en;

                                    // Initialize mountain count
                                    let mountainCount = 0;

                                    // Try matching by name
                                    if (
                                        provinceName &&
                                        typeof provinceName === "string"
                                    ) {
                                        mountainCount =
                                            mountainCountsByProvince[
                                                provinceName
                                            ] || 0;
                                    }

                                    // If no mountains found by name, try with adm2_en
                                    if (
                                        mountainCount === 0 &&
                                        adm2Name &&
                                        typeof adm2Name === "string"
                                    ) {
                                        mountainCount =
                                            mountainCountsByProvince[
                                                adm2Name
                                            ] || 0;
                                    }

                                    // If still no mountains, try normalized versions of the names
                                    if (mountainCount === 0) {
                                        // Try case-insensitive matching
                                        const lowercaseName =
                                            provinceName &&
                                            typeof provinceName === "string"
                                                ? provinceName
                                                      .toLowerCase()
                                                      .trim()
                                                : "";
                                        const lowercaseAdm2 =
                                            adm2Name &&
                                            typeof adm2Name === "string"
                                                ? adm2Name.toLowerCase().trim()
                                                : "";

                                        for (const [
                                            province,
                                            count,
                                        ] of Object.entries(
                                            mountainCountsByProvince
                                        )) {
                                            if (count === 0) continue;

                                            const lowercaseProvince = province
                                                .toLowerCase()
                                                .trim();

                                            // Check if province names match or contain each other
                                            if (
                                                (lowercaseName &&
                                                    (lowercaseName ===
                                                        lowercaseProvince ||
                                                        lowercaseName.includes(
                                                            lowercaseProvince
                                                        ) ||
                                                        lowercaseProvince.includes(
                                                            lowercaseName
                                                        ))) ||
                                                (lowercaseAdm2 &&
                                                    (lowercaseAdm2 ===
                                                        lowercaseProvince ||
                                                        lowercaseAdm2.includes(
                                                            lowercaseProvince
                                                        ) ||
                                                        lowercaseProvince.includes(
                                                            lowercaseAdm2
                                                        )))
                                            ) {
                                                mountainCount = count;
                                                break;
                                            }
                                        }
                                    }

                                    // Add mountainCount to feature properties
                                    return {
                                        ...feature,
                                        properties: {
                                            ...feature.properties,
                                            mountainCount,
                                        },
                                    };
                                }),
                            };

                            // Store boundaries in ref for use in event handlers
                            boundariesRef.current =
                                boundariesWithMountainCounts;

                            // First remove all dependent layers
                            safelyRemoveProvinceLayers();

                            // Then remove the source
                            safelyRemoveSource("provinces");

                            // Add province boundaries source with mountain count data
                            try {
                                // Ensure features have unique IDs
                                boundariesWithMountainCounts.features.forEach(
                                    (feature, index) => {
                                        // Add id if not present
                                        if (!feature.id) {
                                            feature.id = index + 1;
                                        }
                                    }
                                );

                                if (!map.current.getSource("provinces")) {
                                    map.current.addSource("provinces", {
                                        type: "geojson",
                                        data: boundariesWithMountainCounts,
                                    });
                                } else {
                                    // If the source already exists, update its data
                                    (
                                        map.current.getSource(
                                            "provinces"
                                        ) as maptilersdk.GeoJSONSource
                                    ).setData(boundariesWithMountainCounts);
                                }
                            } catch (error) {
                                console.error(
                                    "Error with provinces source:",
                                    error
                                );
                                // If an error occurs, make a more aggressive attempt
                                try {
                                    // Wait a moment to ensure any async operations complete
                                    await new Promise((resolve) =>
                                        setTimeout(resolve, 100)
                                    );

                                    // First remove all province layers
                                    safelyRemoveProvinceLayers();

                                    // Then remove the source
                                    safelyRemoveSource("provinces");

                                    // Add the source back
                                    map.current.addSource("provinces", {
                                        type: "geojson",
                                        data: boundariesWithMountainCounts,
                                    });
                                } catch (retryError) {
                                    console.error(
                                        "Failed to add provinces source after retry:",
                                        retryError
                                    );
                                    return; // Exit if we can't add the source
                                }
                            }

                            // Add province boundaries layer with heat map coloring
                            map.current.addLayer({
                                id: "province-fills",
                                type: "fill",
                                source: "provinces",
                                paint: {
                                    // Simplified expression for fill color based on mountain count
                                    "fill-color": [
                                        "step",
                                        [
                                            "coalesce",
                                            ["get", "mountainCount"],
                                            0,
                                        ],
                                        "#EAEAEA", // Default for 0
                                        1,
                                        "#E5F5E0", // 1-2 mountains
                                        3,
                                        "#C7E9C0", // 3-4 mountains
                                        5,
                                        "#A1D99B", // 5-9 mountains
                                        10,
                                        "#74C476", // 10-14 mountains
                                        15,
                                        "#41AB5D", // 15-19 mountains
                                        20,
                                        "#238B45", // 20-24 mountains
                                        25,
                                        "#006D2C", // 25+ mountains
                                    ],
                                    // Use feature state to control opacity based on selection
                                    "fill-opacity": [
                                        "case",
                                        [
                                            "boolean",
                                            ["feature-state", "selected"],
                                            false,
                                        ],
                                        0.8, // Selected province opacity
                                        [
                                            "case",
                                            [
                                                "boolean",
                                                [
                                                    "feature-state",
                                                    "any-selected",
                                                ],
                                                false,
                                            ],
                                            0.3, // Non-selected provinces when any is selected
                                            0.8, // Default opacity when no selection
                                        ],
                                    ],
                                },
                            });

                            // Add province boundary lines
                            map.current.addLayer({
                                id: "province-borders",
                                type: "line",
                                source: "provinces",
                                paint: {
                                    "line-color": "#627BC1",
                                    "line-width": 1,
                                },
                            });

                            // Add hover effect for provinces
                            map.current.addLayer({
                                id: "province-hover",
                                type: "fill",
                                source: "provinces",
                                paint: {
                                    "fill-color": "#000",
                                    "fill-opacity": [
                                        "case",
                                        [
                                            "boolean",
                                            ["feature-state", "hover"],
                                            false,
                                        ],
                                        0.2,
                                        0,
                                    ],
                                },
                            });

                            // Add province selection outline
                            map.current.addLayer({
                                id: "province-selected",
                                type: "line",
                                source: "provinces",
                                paint: {
                                    "line-color": "#ff8787", // Light Red
                                    "line-width": 3,
                                    "line-opacity": [
                                        "case",
                                        [
                                            "boolean",
                                            ["feature-state", "selected"],
                                            false,
                                        ],
                                        1,
                                        0,
                                    ],
                                    "line-dasharray": [4, 2], // Create dashed effect
                                },
                            });

                            // Add province labels
                            // map.current.addLayer({
                            //     id: "province-labels",
                            //     type: "symbol",
                            //     source: "provinces",
                            //     layout: {
                            //         "text-field": [
                            //             "format",
                            //             ["get", "name"],
                            //             { "font-scale": 0.8 },
                            //             "\n",
                            //             {},
                            //             [
                            //                 "concat",
                            //                 "Mt: ",
                            //                 ["get", "mountainCount"],
                            //             ],
                            //             { "font-scale": 0.6 },
                            //         ],
                            //         "text-font": ["Open Sans Regular"],
                            //         "text-size": 24,
                            //         "text-allow-overlap": false,
                            //         "text-anchor": "center",
                            //     },
                            //     paint: {
                            //         "text-color": "#333",
                            //         "text-halo-color": "#fff",
                            //         "text-halo-width": 1,
                            //     },
                            // });

                            // Setup hover interaction
                            let hoveredProvinceId: string | number | null =
                                null;
                            let provinceHoverPopup: maptilersdk.Popup | null =
                                null;

                            map.current.on(
                                "mousemove",
                                "province-fills",
                                (e) => {
                                    if (
                                        e.features &&
                                        e.features.length > 0 &&
                                        e.features[0].id
                                    ) {
                                        if (hoveredProvinceId !== null) {
                                            map.current?.setFeatureState(
                                                {
                                                    source: "provinces",
                                                    id: hoveredProvinceId,
                                                },
                                                { hover: false }
                                            );
                                        }

                                        hoveredProvinceId = e.features[0].id;

                                        map.current?.setFeatureState(
                                            {
                                                source: "provinces",
                                                id: hoveredProvinceId,
                                            },
                                            { hover: true }
                                        );

                                        // Get province information
                                        const feature = e.features[0];
                                        const provinceName =
                                            feature.properties?.name ||
                                            feature.properties?.adm2_en ||
                                            "Unknown Province";
                                        const mountainCount =
                                            feature.properties?.mountainCount ||
                                            0;

                                        // Create popup content
                                        const popupContent = `
                                            <div class="province-popup" style="padding: 8px; font-family: system-ui, sans-serif; line-height: 1.3;">
                                                <strong style="font-size: 1.1em; color: #17ad49;">${provinceName}</strong>
                                                <span style="display: block; margin-top: 0;">Mountains: <b>${mountainCount}</b></span>
                                            </div>
                                        `;

                                        // Remove any existing province hover popup
                                        if (provinceHoverPopup) {
                                            provinceHoverPopup.remove();
                                        }

                                        // Only create popup if not currently selected
                                        if (
                                            hoveredProvinceId !==
                                            selectedProvinceIdRef.current
                                        ) {
                                            // Create new popup at mouse position
                                            provinceHoverPopup =
                                                new maptilersdk.Popup({
                                                    closeButton: false,
                                                    closeOnClick: false,
                                                    offset: 10,
                                                    className: "province-popup",
                                                })
                                                    .setLngLat(e.lngLat)
                                                    .setHTML(popupContent);

                                            // Add to map
                                            if (map.current) {
                                                provinceHoverPopup.addTo(
                                                    map.current as maptilersdk.Map
                                                );
                                            }
                                        }
                                    }
                                }
                            );

                            map.current.on(
                                "mouseleave",
                                "province-fills",
                                () => {
                                    if (hoveredProvinceId !== null) {
                                        map.current?.setFeatureState(
                                            {
                                                source: "provinces",
                                                id: hoveredProvinceId,
                                            },
                                            { hover: false }
                                        );
                                    }
                                    hoveredProvinceId = null;

                                    // Remove hover popup when mouse leaves
                                    if (provinceHoverPopup) {
                                        provinceHoverPopup.remove();
                                        provinceHoverPopup = null;
                                    }
                                }
                            );

                            // Remove any existing click handler to prevent duplicates
                            if (clickHandlerRef.current && map.current) {
                                map.current.off(
                                    "click",
                                    "province-fills",
                                    clickHandlerRef.current
                                );
                                clickHandlerRef.current = null;
                            }

                            // Create click handler function
                            const provinceClickHandler = (
                                e: maptilersdk.MapLayerMouseEvent
                            ) => {
                                // Check if we should skip this click (was previously handled by mountain layer)
                                if (
                                    (map.current as ExtendedMap)
                                        ._skipNextProvinceClick
                                ) {
                                    (
                                        map.current as ExtendedMap
                                    )._skipNextProvinceClick = false;
                                    return;
                                }

                                if (e.features && e.features.length > 0) {
                                    const feature = e.features[0];

                                    // Get province ID for highlighting
                                    const provinceId = feature.id ?? null;

                                    // If clicking the same province, deselect it
                                    if (
                                        provinceId ===
                                        selectedProvinceIdRef.current
                                    ) {
                                        // Reset the selected province
                                        if (
                                            selectedProvinceIdRef.current !==
                                                null &&
                                            map.current
                                        ) {
                                            map.current.setFeatureState(
                                                {
                                                    source: "provinces",
                                                    id: selectedProvinceIdRef.current,
                                                },
                                                { selected: false }
                                            );

                                            // Reset the "any-selected" state for all provinces
                                            if (
                                                boundariesRef.current &&
                                                boundariesRef.current.features
                                            ) {
                                                boundariesRef.current.features.forEach(
                                                    (feature) => {
                                                        if (
                                                            feature.id !==
                                                                null &&
                                                            feature.id !==
                                                                undefined
                                                        ) {
                                                            map.current?.setFeatureState(
                                                                {
                                                                    source: "provinces",
                                                                    id: feature.id,
                                                                },
                                                                {
                                                                    "any-selected":
                                                                        false,
                                                                }
                                                            );
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                        selectedProvinceIdRef.current = null;

                                        // Remove visible mountains
                                        safelyRemoveLayer("visible-mountains");
                                        safelyRemoveSource("visible-mountains");

                                        return;
                                    }

                                    // Remove highlight from previous selection
                                    if (
                                        selectedProvinceIdRef.current !==
                                            null &&
                                        map.current
                                    ) {
                                        map.current.setFeatureState(
                                            {
                                                source: "provinces",
                                                id: selectedProvinceIdRef.current,
                                            },
                                            { selected: false }
                                        );
                                    }

                                    // Add highlight to new selection
                                    if (provinceId !== null && map.current) {
                                        map.current.setFeatureState(
                                            {
                                                source: "provinces",
                                                id: provinceId,
                                            },
                                            { selected: true }
                                        );

                                        // Set "any-selected" state for all provinces
                                        if (
                                            boundariesRef.current &&
                                            boundariesRef.current.features
                                        ) {
                                            boundariesRef.current.features.forEach(
                                                (feature) => {
                                                    if (
                                                        feature.id !== null &&
                                                        feature.id !== undefined
                                                    ) {
                                                        map.current?.setFeatureState(
                                                            {
                                                                source: "provinces",
                                                                id: feature.id,
                                                            },
                                                            {
                                                                "any-selected":
                                                                    true,
                                                            }
                                                        );
                                                    }
                                                }
                                            );
                                        }
                                    }

                                    // Update the selected province ID
                                    selectedProvinceIdRef.current = provinceId;

                                    // Get province name from feature
                                    const provinceName =
                                        feature.properties?.adm2_en ||
                                        feature.properties?.name;

                                    console.group(`Region: ${provinceName}`);

                                    try {
                                        // Check if mountains data is available
                                        if (!mountains || !mountains.features) {
                                            console.error(
                                                "Error: Mountains data is not available"
                                            );
                                            console.groupEnd();
                                            return;
                                        }

                                        // Find mountains with matching province in the prov array
                                        const provinceMountains =
                                            mountains.features.filter(
                                                (mountain) => {
                                                    // Check if the prov array includes the province name
                                                    const provArray =
                                                        mountain.properties
                                                            ?.prov;
                                                    return (
                                                        Array.isArray(
                                                            provArray
                                                        ) &&
                                                        provArray.some(
                                                            (prov) =>
                                                                prov &&
                                                                typeof prov ===
                                                                    "string" &&
                                                                prov.toLowerCase() ===
                                                                    provinceName.toLowerCase()
                                                        )
                                                    );
                                                }
                                            );

                                        // Create a new GeoJSON source with just the mountains in this province
                                        const provinceMountainsGeoJSON: FeatureCollection<
                                            Point,
                                            MountainProperties
                                        > = {
                                            type: "FeatureCollection",
                                            features: provinceMountains,
                                        };

                                        // Remove any existing visible mountains layer
                                        safelyRemoveLayer("visible-mountains");
                                        safelyRemoveSource("visible-mountains");

                                        // Add the new mountains source and layer if we have mountains
                                        if (
                                            provinceMountains.length > 0 &&
                                            map.current
                                        ) {
                                            // Add source for visible mountains
                                            map.current.addSource(
                                                "visible-mountains",
                                                {
                                                    type: "geojson",
                                                    data: provinceMountainsGeoJSON,
                                                }
                                            );

                                            // Add visible mountains layer
                                            map.current.addLayer({
                                                id: "visible-mountains",
                                                type: "circle",
                                                source: "visible-mountains",
                                                paint: {
                                                    "circle-radius": 8,
                                                    "circle-color": "#d62828",
                                                    "circle-opacity": 0.8,
                                                    "circle-stroke-width": 1,
                                                    "circle-stroke-color":
                                                        "#ffffff",
                                                },
                                            });

                                            // Add mountain name labels
                                            map.current.addLayer({
                                                id: "mountain-labels",
                                                type: "symbol",
                                                source: "visible-mountains",
                                                layout: {
                                                    "text-field": [
                                                        "get",
                                                        "name",
                                                    ],
                                                    "text-font": [
                                                        "Open Sans Regular",
                                                    ],
                                                    "text-size": 12,
                                                    "text-anchor": "top",
                                                    "text-offset": [0, 0.8],
                                                    "text-allow-overlap": false,
                                                    "text-ignore-placement":
                                                        false,
                                                    "symbol-sort-key": [
                                                        "-",
                                                        [
                                                            "coalesce",
                                                            ["get", "elev"],
                                                            0,
                                                        ],
                                                    ],
                                                },
                                                paint: {
                                                    "text-color": "#333",
                                                    "text-halo-color": "#fff",
                                                    "text-halo-width": 1.5,
                                                },
                                            });

                                            // Create a variable to track the hover popup
                                            let hoverPopup: maptilersdk.Popup | null =
                                                null;

                                            // Add hover effects for mountains
                                            map.current.on(
                                                "mouseenter",
                                                "visible-mountains",
                                                (e) => {
                                                    if (map.current) {
                                                        map.current.getCanvas().style.cursor =
                                                            "pointer";

                                                        // Get feature information
                                                        if (
                                                            e.features &&
                                                            e.features.length >
                                                                0
                                                        ) {
                                                            const feature =
                                                                e.features[0];
                                                            const coordinates =
                                                                (
                                                                    feature.geometry as Point
                                                                ).coordinates;
                                                            const name =
                                                                feature
                                                                    .properties
                                                                    ?.name ||
                                                                "Unnamed Mountain";
                                                            const elevation =
                                                                feature
                                                                    .properties
                                                                    ?.elevation ||
                                                                feature
                                                                    .properties
                                                                    ?.elev;
                                                            const prominence =
                                                                feature
                                                                    .properties
                                                                    ?.prom;
                                                            const region =
                                                                feature
                                                                    .properties
                                                                    ?.region;
                                                            const provinceArr =
                                                                feature
                                                                    .properties
                                                                    ?.prov;

                                                            // Format regions and provinces for display
                                                            const regionText =
                                                                Array.isArray(
                                                                    region
                                                                )
                                                                    ? region.join(
                                                                          ", "
                                                                      )
                                                                    : typeof region ===
                                                                      "string"
                                                                    ? region
                                                                    : "";
                                                            const provinceText =
                                                                Array.isArray(
                                                                    provinceArr
                                                                )
                                                                    ? provinceArr.join(
                                                                          ", "
                                                                      )
                                                                    : typeof provinceArr ===
                                                                      "string"
                                                                    ? provinceArr
                                                                    : "";

                                                            // Create popup content
                                                            const popupContent = `
                                                            <div class="mountain-popup" style="padding: 8px; font-family: system-ui, sans-serif; line-height: 1.3;">
                                                                <strong style="font-size: 1.1em; color: #d62828;">${name}</strong>
                                                                ${
                                                                    elevation
                                                                        ? `<span style="display: block; margin-top: 0;">Elevation: <b>${elevation}m</b></span>`
                                                                        : ""
                                                                }
                                                                ${
                                                                    prominence
                                                                        ? `<span style="display: block; margin-top: 0;">Prominence: <b>${prominence}m</b></span>`
                                                                        : ""
                                                                }
                                                                ${
                                                                    provinceText
                                                                        ? `<span style="display: block; margin-top: 0;">Province: <b>${provinceText}</b></span>`
                                                                        : ""
                                                                }
                                                                ${
                                                                    regionText
                                                                        ? `<span style="display: block; margin-top: 0;">Region: <b>${regionText}</b></span>`
                                                                        : ""
                                                                }
                                                            </div>
                                                        `;

                                                            // Remove any existing hover popup
                                                            if (hoverPopup) {
                                                                hoverPopup.remove();
                                                            }

                                                            // Create new popup
                                                            const popup =
                                                                new maptilersdk.Popup(
                                                                    {
                                                                        closeButton:
                                                                            false,
                                                                        closeOnClick:
                                                                            false,
                                                                        offset: 10,
                                                                    }
                                                                )
                                                                    .setLngLat(
                                                                        coordinates as [
                                                                            number,
                                                                            number
                                                                        ]
                                                                    )
                                                                    .setHTML(
                                                                        popupContent
                                                                    );

                                                            // Only add to map if map is available
                                                            if (map.current) {
                                                                hoverPopup =
                                                                    popup.addTo(
                                                                        map.current as maptilersdk.Map
                                                                    );
                                                            }
                                                        }
                                                    }
                                                }
                                            );

                                            map.current.on(
                                                "mouseleave",
                                                "visible-mountains",
                                                () => {
                                                    if (map.current) {
                                                        map.current.getCanvas().style.cursor =
                                                            "";

                                                        // Remove hover popup when mouse leaves
                                                        if (hoverPopup) {
                                                            hoverPopup.remove();
                                                            hoverPopup = null;
                                                        }
                                                    }
                                                }
                                            );
                                        }

                                        console.log(
                                            `Mountains in this area: ${provinceMountains.length}`
                                        );

                                        const mountainProperties =
                                            provinceMountains.map(
                                                (m) => m.properties
                                            );

                                        if (mountainProperties.length > 0) {
                                            // Calculate mountain statistics
                                            let highestMountain = {
                                                name: "",
                                                elevation: 0,
                                            };
                                            let totalElevation = 0;
                                            let mountainsWithElevation = 0;

                                            mountainProperties.forEach(
                                                (mountain) => {
                                                    if (mountain.elevation) {
                                                        mountainsWithElevation++;
                                                        totalElevation +=
                                                            mountain.elevation;

                                                        if (
                                                            mountain.elevation >
                                                            (highestMountain.elevation ||
                                                                0)
                                                        ) {
                                                            highestMountain = {
                                                                name:
                                                                    mountain.name ||
                                                                    "Unnamed Mountain",
                                                                elevation:
                                                                    mountain.elevation,
                                                            };
                                                        }
                                                    }
                                                }
                                            );

                                            // Log statistics
                                            console.group(
                                                "Mountain Statistics:"
                                            );
                                            if (mountainsWithElevation > 0) {
                                                console.log(
                                                    `Highest mountain: ${highestMountain.name} (${highestMountain.elevation}m)`
                                                );
                                                console.log(
                                                    `Average elevation: ${Math.round(
                                                        totalElevation /
                                                            mountainsWithElevation
                                                    )}m`
                                                );
                                                console.log(
                                                    `Total mountains with elevation data: ${mountainsWithElevation}/${mountainProperties.length}`
                                                );
                                            } else {
                                                console.log(
                                                    "No elevation data available for mountains in this region"
                                                );
                                            }
                                            console.groupEnd();

                                            // List all mountains
                                            console.group(
                                                "Mountains in this region:"
                                            );
                                            mountainProperties.forEach(
                                                (mountain, index) => {
                                                    console.log(
                                                        `${index + 1}. ${
                                                            mountain.name ||
                                                            "Unnamed Mountain"
                                                        }${
                                                            mountain.elevation
                                                                ? ` (${mountain.elevation}m)`
                                                                : ""
                                                        }`
                                                    );
                                                }
                                            );
                                            console.groupEnd();
                                        } else {
                                            console.log(
                                                "No mountains found in this region"
                                            );
                                        }
                                    } catch (error) {
                                        console.error(
                                            "Error processing province:",
                                            error
                                        );
                                    }

                                    console.groupEnd();
                                } else {
                                    // If clicked outside a province, remove visible mountains
                                    safelyRemoveLayer("visible-mountains");
                                    safelyRemoveSource("visible-mountains");
                                }
                            };

                            // Store the handler in the ref
                            clickHandlerRef.current = provinceClickHandler;

                            // Add click handler to province layer
                            map.current.on(
                                "click",
                                "province-fills",
                                clickHandlerRef.current
                            );

                            // Add a general map click handler to clear selection when clicking outside provinces
                            map.current.on("click", (e) => {
                                // Skip if the click was handled by a layer or map is not available
                                if (
                                    !map.current ||
                                    (map.current as ExtendedMap)
                                        ._skipNextProvinceClick ||
                                    map.current.queryRenderedFeatures(e.point, {
                                        layers: ["province-fills"],
                                    }).length > 0
                                ) {
                                    return;
                                }

                                // Clear selection when clicking outside provinces
                                if (
                                    selectedProvinceIdRef.current !== null &&
                                    map.current
                                ) {
                                    map.current.setFeatureState(
                                        {
                                            source: "provinces",
                                            id: selectedProvinceIdRef.current,
                                        },
                                        { selected: false }
                                    );
                                    selectedProvinceIdRef.current = null;

                                    // Reset the "any-selected" state for all provinces
                                    if (
                                        boundariesRef.current &&
                                        boundariesRef.current.features
                                    ) {
                                        boundariesRef.current.features.forEach(
                                            (feature) => {
                                                if (
                                                    feature.id !== null &&
                                                    feature.id !== undefined
                                                ) {
                                                    map.current?.setFeatureState(
                                                        {
                                                            source: "provinces",
                                                            id: feature.id,
                                                        },
                                                        {
                                                            "any-selected":
                                                                false,
                                                        }
                                                    );
                                                }
                                            }
                                        );
                                    }

                                    // Remove visible mountains
                                    safelyRemoveLayer("visible-mountains");
                                    safelyRemoveLayer("mountain-labels");
                                    safelyRemoveSource("visible-mountains");
                                }
                            });
                        }

                        if (mountains && map.current) {
                            // First remove dependent layers
                            safelyRemoveLayer("mountains");

                            // Then remove the source
                            safelyRemoveSource("mountains");

                            // Add mountains source but don't display them visually
                            try {
                                if (!map.current.getSource("mountains")) {
                                    map.current.addSource("mountains", {
                                        type: "geojson",
                                        data: mountains,
                                    });
                                } else {
                                    // If the source already exists, update its data
                                    (
                                        map.current.getSource(
                                            "mountains"
                                        ) as maptilersdk.GeoJSONSource
                                    ).setData(mountains);
                                }
                            } catch (error) {
                                console.error(
                                    "Error with mountains source:",
                                    error
                                );
                                // If an error occurs, make a more aggressive attempt
                                try {
                                    // Wait a moment to ensure any async operations complete
                                    await new Promise((resolve) =>
                                        setTimeout(resolve, 100)
                                    );

                                    // Make sure we remove any layers using this source first
                                    safelyRemoveLayer("mountains");
                                    safelyRemoveLayer("visible-mountains");

                                    // Then safely remove the source
                                    safelyRemoveSource("mountains");

                                    map.current.addSource("mountains", {
                                        type: "geojson",
                                        data: mountains,
                                    });
                                } catch (retryError) {
                                    console.error(
                                        "Failed to add mountains source after retry:",
                                        retryError
                                    );
                                    return; // Exit if we can't add the source
                                }
                            }

                            // Remove the mountains layer visual display
                            // Keep the mountains source for click handler functionality
                        }
                    } catch (error) {
                        console.error("Error loading province data:", error);
                    }
                });
            } catch (error) {
                console.error("Error initializing map:", error);
            }
        }

        initializeMap();

        // Cleanup on unmount
        return () => {
            try {
                if (map.current) {
                    // Clear selected province state if any
                    if (selectedProvinceIdRef.current !== null) {
                        try {
                            map.current.setFeatureState(
                                {
                                    source: "provinces",
                                    id: selectedProvinceIdRef.current,
                                },
                                { selected: false }
                            );
                            selectedProvinceIdRef.current = null;
                        } catch (error) {
                            console.warn(
                                "Error clearing selected province state:",
                                error
                            );
                        }
                    }

                    // Reset any-selected state for all provinces
                    if (
                        boundariesRef.current &&
                        boundariesRef.current.features
                    ) {
                        try {
                            boundariesRef.current.features.forEach(
                                (feature) => {
                                    if (
                                        feature.id !== null &&
                                        feature.id !== undefined
                                    ) {
                                        map.current?.setFeatureState(
                                            {
                                                source: "provinces",
                                                id: feature.id,
                                            },
                                            { "any-selected": false }
                                        );
                                    }
                                }
                            );
                        } catch (error) {
                            console.warn(
                                "Error resetting province states:",
                                error
                            );
                        }
                    }

                    if (clickHandlerRef.current) {
                        map.current.off(
                            "click",
                            "province-fills",
                            clickHandlerRef.current
                        );
                        clickHandlerRef.current = null;
                    }

                    // Remove mountain-specific layers and sources in the correct order
                    safelyRemoveLayer("visible-mountains");
                    safelyRemoveLayer("mountain-labels");
                    safelyRemoveSource("visible-mountains");

                    // Remove province layers in the correct order
                    safelyRemoveProvinceLayers();

                    // Then remove province source
                    safelyRemoveSource("provinces");

                    // Remove mountains source
                    safelyRemoveSource("mountains");

                    if (isMapLoaded) {
                        map.current.remove();
                        mapInitializedRef.current = false;
                    }
                }
            } catch (error) {
                console.error("Error cleaning up map:", error);
            }
        };
    }, [initialCenter, initialZoom]); // Only re-initialize if these props change

    // Helper function to calculate number of mountains in each province
    // Uses the 'prov' property in mountain data instead of point-in-polygon
    function calculateMountainCountsByProvince(
        boundaries: FeatureCollection<Geometry, ProvinceProperties>,
        mountains: FeatureCollection<Point, MountainProperties>
    ): Record<string, number> {
        const counts: Record<string, number> = {};
        const provinceNames: string[] = [];
        const provinceNameMap: Record<string, string> = {}; // Maps normalized names to original names

        // Initialize all provinces with 0 mountains and collect province names
        boundaries.features.forEach((province) => {
            const provinceName = province.properties?.name;
            const provinceAltName = province.properties?.adm2_en;

            if (provinceName && typeof provinceName === "string") {
                counts[provinceName] = 0;
                provinceNames.push(provinceName);

                // Store normalized version for matching
                const normalizedName = provinceName.toLowerCase().trim();
                provinceNameMap[normalizedName] = provinceName;
            }

            // Also add alternative name if different
            if (
                provinceAltName &&
                typeof provinceAltName === "string" &&
                provinceAltName !== provinceName
            ) {
                counts[provinceAltName] = 0;
                provinceNames.push(provinceAltName);

                // Store normalized version for matching
                const normalizedAltName = provinceAltName.toLowerCase().trim();
                provinceNameMap[normalizedAltName] = provinceAltName;
            }
        });

        // Set to track unmatched provinces for debugging
        const unmatchedProvinces = new Set<string>();

        // Count mountains for each province based on the 'prov' property
        mountains.features.forEach((mountain) => {
            const provArray = mountain.properties?.prov;

            // Skip if no province array or not an array
            if (!Array.isArray(provArray)) {
                // Try to match using coordinates if prov is missing
                const coordinates = (mountain.geometry as Point).coordinates;
                if (coordinates && boundaries && boundaries.features) {
                    for (const province of boundaries.features) {
                        if (
                            isPointInPolygon(
                                coordinates as [number, number],
                                province.geometry
                            )
                        ) {
                            const provinceName =
                                province.properties?.name ||
                                province.properties?.adm2_en;
                            if (
                                provinceName &&
                                typeof provinceName === "string"
                            ) {
                                counts[provinceName]++;
                            }
                            break;
                        }
                    }
                }
                return;
            }

            // Increment count for each province this mountain belongs to
            let matched = false;
            provArray.forEach((provinceName) => {
                if (provinceName && typeof provinceName === "string") {
                    const provinceNameLower = provinceName.toLowerCase().trim();

                    // First try direct match
                    if (counts.hasOwnProperty(provinceName)) {
                        counts[provinceName]++;
                        matched = true;
                        return;
                    }

                    // Then try normalized map
                    if (provinceNameMap[provinceNameLower]) {
                        counts[provinceNameMap[provinceNameLower]]++;
                        matched = true;
                        return;
                    }

                    // Then try case-insensitive match
                    for (const existingProvince in counts) {
                        // Check for exact match
                        if (
                            existingProvince.toLowerCase() === provinceNameLower
                        ) {
                            counts[existingProvince]++;
                            matched = true;
                            return;
                        }

                        // Check if province name contains the mountain's province name or vice versa
                        if (
                            existingProvince
                                .toLowerCase()
                                .includes(provinceNameLower) ||
                            provinceNameLower.includes(
                                existingProvince.toLowerCase()
                            )
                        ) {
                            counts[existingProvince]++;
                            matched = true;
                            return;
                        }
                    }

                    // If no match found, track for debugging
                    if (!matched) {
                        unmatchedProvinces.add(provinceName);
                    }
                }
            });
        });

        return counts;
    }

    // Helper function to check if a point is within a polygon
    // This function is kept for reference but is no longer actively used
    // as we now use the 'prov' property from mountain data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function isPointInPolygon(
        point: [number, number],
        geometry: Geometry
    ): boolean {
        // Handle different geometry types
        if (geometry.type === "Polygon") {
            const polygon = geometry as Polygon;
            return isPointInSinglePolygon(
                point,
                polygon.coordinates[0] as [number, number][]
            );
        } else if (geometry.type === "MultiPolygon") {
            const multiPolygon = geometry as MultiPolygon;
            // Check each polygon in the multi-polygon
            return multiPolygon.coordinates.some((polygonCoords) =>
                isPointInSinglePolygon(
                    point,
                    polygonCoords[0] as [number, number][]
                )
            );
        }
        return false;
    }

    // Ray casting algorithm for point in polygon
    function isPointInSinglePolygon(
        point: [number, number],
        polygon: [number, number][]
    ): boolean {
        const x = point[0];
        const y = point[1];
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0];
            const yi = polygon[i][1];
            const xj = polygon[j][0];
            const yj = polygon[j][1];

            const intersect =
                yi > y !== yj > y &&
                x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

            if (intersect) inside = !inside;
        }

        return inside;
    }

    return (
        <div
            ref={mapContainer}
            className="w-full h-full rounded-lg"
            style={{ minHeight: "400px" }}
        />
    );
}

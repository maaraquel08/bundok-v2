import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    webpack: (config, { isServer }) => {
        // Ignore specific Leaflet errors in the browser console
        if (!isServer) {
            config.ignoreWarnings = [{ module: /node_modules\/leaflet/ }];
        }

        return config;
    },
};

export default nextConfig;

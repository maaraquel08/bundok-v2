import { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    webpack: (config, { isServer }) => {
        // Ignore specific Leaflet errors in the browser console
        if (!isServer) {
            config.ignoreWarnings = [{ module: /node_modules\/leaflet/ }];
        }

        // Add support for importing from both src/app/lib and lib directories
        config.resolve.alias = {
            ...config.resolve.alias,
            "@/app/lib": "./src/app/lib",
            "@/app/components": "./src/app/components",
        };

        return config;
    },
};

export default nextConfig;

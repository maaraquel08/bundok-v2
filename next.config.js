/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        ignoreBuildErrors: true,
    },
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
            "@/lib": "./src/lib",
            "@/components": "./src/components",
        };

        return config;
    },
};

module.exports = nextConfig;

# Bundok

A Next.js application for exploring Philippine mountains and geographical data.

## Data Sources

This project utilizes geographical data from the following sources:

### Philippine Administrative Boundaries

-   Source: [philippines-json-maps](https://github.com/faeldon/philippines-json-maps)
-   Provides administrative boundaries in GeoJSON and TopoJSON formats
-   Includes different administrative levels:
    -   Country (Level 0)
    -   Region (Level 1)
    -   Province/District (Level 2)
    -   Municipality/Cities (Level 3)
    -   Barangays/Sub-Municipalities (Level 4)
-   Available in multiple resolutions (high, medium, low)
-   Data updated as of December 31, 2023

### Philippine Mountains Data

-   Source: [phl-mountains](https://github.com/j4ckofalltrades/phl-mountains)
-   Contains GeoJSON data for Philippine mountains
-   Organized by:
    -   Island groups
    -   Provinces
    -   Regions

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a custom font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Bundok - Philippine Mountains Explorer",
    description: "Interactive map of mountains in the Philippines",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                {/* In Next.js, we don't need to add the CSS in the layout if it's imported in the component */}
                {/* The CSS path was incorrect - removing this line as the import in Map.tsx should handle it */}
            </head>
            <body>{children}</body>
        </html>
    );
}

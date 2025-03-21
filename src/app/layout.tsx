import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
            <body className={inter.className}>{children}</body>
        </html>
    );
}

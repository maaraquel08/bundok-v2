import { useEffect } from "react";

interface SheetPanelProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export function SheetPanel({
    isOpen,
    onClose,
    title,
    children,
}: SheetPanelProps) {
    // Prevent scroll on body when sheet is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            style={{
                opacity: isOpen ? 1 : 0,
                transition: "opacity 200ms ease-out",
            }}
        >
            <div
                className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transition-transform"
                onClick={(e) => e.stopPropagation()}
                style={{
                    transform: isOpen ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-lg font-semibold">
                            {title || "Details"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-gray-100"
                            aria-label="Close"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5"
                            >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

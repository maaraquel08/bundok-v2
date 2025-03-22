import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="sheet-panel"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                    }}
                >
                    <div className="sheet-panel-container">
                        <div className="sheet-panel-header">
                            <h2 className="sheet-panel-title">
                                {title || "Details"}
                            </h2>
                            <button
                                onClick={onClose}
                                className="sheet-panel-close-button"
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
                                    className="sheet-panel-icon"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="sheet-panel-content">{children}</div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

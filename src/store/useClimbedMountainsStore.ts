import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ClimbedMountainsState {
    climbedMountains: Record<string, boolean>;
    toggleMountain: (mountainId: string) => void;
    markMountainAsClimbed: (mountainId: string) => void;
    markMountainAsNotClimbed: (mountainId: string) => void;
    resetAllMountains: () => void;
}

const useClimbedMountainsStore = create<ClimbedMountainsState>()(
    persist(
        (set) => ({
            climbedMountains: {},

            toggleMountain: (mountainId) =>
                set((state) => ({
                    climbedMountains: {
                        ...state.climbedMountains,
                        [mountainId]: !state.climbedMountains[mountainId],
                    },
                })),

            markMountainAsClimbed: (mountainId) =>
                set((state) => ({
                    climbedMountains: {
                        ...state.climbedMountains,
                        [mountainId]: true,
                    },
                })),

            markMountainAsNotClimbed: (mountainId) =>
                set((state) => ({
                    climbedMountains: {
                        ...state.climbedMountains,
                        [mountainId]: false,
                    },
                })),

            resetAllMountains: () => set({ climbedMountains: {} }),
        }),
        {
            name: "climbed-mountains-storage",
        }
    )
);

export default useClimbedMountainsStore;

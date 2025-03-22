import { SheetPanel } from "./SheetPanel";
import useClimbedMountainsStore from "../../store/useClimbedMountainsStore";

interface Mountain {
    id: string;
    name: string;
    elevation: number;
    prominence: number;
}

interface ProvinceDetailPanelProps {
    isOpen: boolean;
    onClose: () => void;
    provinceName: string;
    mountains: Mountain[];
}

export function ProvinceDetailPanel({
    isOpen,
    onClose,
    provinceName,
    mountains = [],
}: ProvinceDetailPanelProps) {
    const { climbedMountains, toggleMountain } = useClimbedMountainsStore();
    const climbedCount = mountains.filter((m) => climbedMountains[m.id]).length;

    return (
        <SheetPanel isOpen={isOpen} onClose={onClose} title={provinceName}>
            <div>
                <div className="province-stats">
                    <h2 className="stats-heading">Province Statistics</h2>
                    <p className="climb-stats">
                        Mountains I&apos;ve Climbed: {climbedCount} /{" "}
                        {mountains.length}
                    </p>
                </div>

                <h3 className="mountains-heading">
                    Mountains in {provinceName}
                </h3>
                <div className="mountain-list">
                    {mountains.map((mountain) => (
                        <div key={mountain.id} className="mountain-item">
                            <input
                                type="checkbox"
                                className="mountain-checkbox"
                                checked={!!climbedMountains[mountain.id]}
                                onChange={() => toggleMountain(mountain.id)}
                                id={`mountain-${mountain.id}`}
                            />
                            <div className="mountain-details">
                                <span className="mountain-name">
                                    {mountain.name}
                                </span>
                                <span className="mountain-elevation">
                                    Elevation: {mountain.elevation}m
                                </span>
                                <span className="mountain-prominence">
                                    Prominence: {mountain.prominence}m
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </SheetPanel>
    );
}

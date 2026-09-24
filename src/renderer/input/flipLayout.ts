import type { Guide, GuideAxis } from "../../document/guides";
import type {
	Alignment,
	DisplayMode,
	LayerLayout,
	LayoutPatch,
	Placement,
	Side,
} from "../../document/layout";

const SIDES_ALONG: Readonly<Record<GuideAxis, readonly [Side, Side]>> = {
	x: ["left", "right"],
	y: ["top", "bottom"],
};
const MAIN_AXIS: Readonly<Record<Exclude<DisplayMode, "block">, GuideAxis>> = {
	row: "x",
	column: "y",
	grid: "x",
};
export const TRACKS_ALONG = { x: "columns", y: "rows" } as const;
const SPAN_ALONG = { x: "column", y: "row" } as const;
const OPPOSITE: Readonly<Record<Alignment, Alignment>> = {
	start: "end",
	center: "center",
	end: "start",
};

export function swappedSides<T>(
	sides: Readonly<Record<Side, T>>,
	axis: GuideAxis,
): Record<Side, T> {
	const [near, far] = SIDES_ALONG[axis];
	return { ...sides, [near]: sides[far], [far]: sides[near] };
}

export function holdsMirror(layout: LayerLayout, flowCells: readonly Placement[]): boolean {
	if (layout.display === "block") {
		return true;
	}
	if (layout.wrap) {
		return false;
	}
	return layout.display !== "grid" || flowCells.every((cell) => insideTracks(layout, cell));
}

function insideTracks({ tracks }: LayerLayout, cell: Placement): boolean {
	return (
		cell.mode === "place" &&
		cell.column.end <= tracks.columns.length + 1 &&
		cell.row.end <= tracks.rows.length + 1
	);
}

export function reversesOrder(layout: LayerLayout, axis: GuideAxis): boolean {
	return (
		(layout.display === "row" || layout.display === "column") && MAIN_AXIS[layout.display] === axis
	);
}

function mirroredAlign(layout: LayerLayout, axis: GuideAxis): LayerLayout["align"] {
	const { align } = layout;
	if (layout.display === "block") {
		return align;
	}
	return MAIN_AXIS[layout.display] === axis
		? { ...align, main: OPPOSITE[align.main] }
		: { ...align, cross: OPPOSITE[align.cross] };
}

function mirroredTracks({ tracks }: LayerLayout, axis: GuideAxis): LayerLayout["tracks"] {
	const key = TRACKS_ALONG[axis];
	return { ...tracks, [key]: tracks[key].toReversed() };
}

export function mirroredLayout(layout: LayerLayout, axis: GuideAxis): LayoutPatch {
	const padding = swappedSides(layout.padding, axis);
	if (layout.display === "block") {
		return { padding };
	}
	const align = mirroredAlign(layout, axis);
	return layout.display === "grid"
		? { padding, align, tracks: mirroredTracks(layout, axis) }
		: { padding, align };
}

export function mirroredCell(cell: Placement, axis: GuideAxis, tracks: number): Placement {
	if (cell.mode === "auto") {
		return cell;
	}
	const last = tracks + 2;
	const span = cell[SPAN_ALONG[axis]];
	const mirrored = { start: last - span.end, end: last - span.start };
	return axis === "x" ? { ...cell, column: mirrored } : { ...cell, row: mirrored };
}

export function mirroredGuides(guides: readonly Guide[], axis: GuideAxis, size: number): Guide[] {
	return guides.map((guide) => (guide.axis === axis ? { ...guide, at: size - guide.at } : guide));
}

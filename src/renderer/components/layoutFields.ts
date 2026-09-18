import type { Layer, LayerPatch } from "../../document/layer";
import { PIXELS } from "../../document/length";
import { gridTracks } from "../../document/layout";
import type { Cell, Direction, Guide, GuideAxis, Layout, LayoutKind } from "../../document/layout";
import { LENGTH_STEP } from "../input/step";
import type { SegmentOption } from "./Segmented";
import type { FieldGroup, LayerField } from "./layerFields";
import type { Bound } from "./numberValue";

const SPACE_LIMIT = 10_000;
const TRACK_LIMIT = 100;
const NO_UNIT = "";
const ONE_TRACK: Bound = { kind: "clamp", min: 1, max: TRACK_LIMIT };
const SPACE_BOUND: Bound = { kind: "clamp", min: 0, max: SPACE_LIMIT };
const TRACK_STEP = { small: 1, normal: 1, large: 1 };

export const LAYOUT_MESSAGE = "set layout";
const CELL_MESSAGE = "set cell";
export const GUIDE_MESSAGE = "set guides";

export const LAYOUT_KINDS: readonly SegmentOption<LayoutKind>[] = [
	{ value: "free", label: "Free" },
	{ value: "flex", label: "Flex" },
	{ value: "grid", label: "Grid" },
];

export const DIRECTIONS: readonly SegmentOption<Direction>[] = [
	{ value: "row", label: "Row" },
	{ value: "column", label: "Column" },
];

export const GUIDE_LABELS: Readonly<Record<GuideAxis, string>> = { x: "Vertical", y: "Horizontal" };

type SpaceKey = "gap" | "padding";
type TrackKey = "columns" | "rows";

function spacingOf(layout: Layout): { gap: number; padding: number } {
	return layout.kind === "free"
		? { gap: 0, padding: 0 }
		: { gap: layout.gap, padding: layout.padding };
}

export function layoutWithKind(layout: Layout, kind: LayoutKind): Layout {
	const space = spacingOf(layout);
	if (kind === "flex") {
		return { kind, direction: "row", ...space };
	}
	return kind === "grid" ? { kind, columns: 2, rows: 2, ...space } : { kind: "free" };
}

function spaceField(label: string, key: SpaceKey, layout: Layout): LayerField {
	return {
		label,
		unit: PIXELS,
		choice: null,
		bound: SPACE_BOUND,
		step: LENGTH_STEP,
		message: LAYOUT_MESSAGE,
		read: (layer) => spacingOf(layer.layout)[key],
		patch: (value) => ({ layout: { ...layout, [key]: value } }),
	};
}

function trackField(label: string, key: TrackKey, layout: Extract<Layout, { kind: "grid" }>) {
	const field: LayerField = {
		label,
		unit: NO_UNIT,
		choice: null,
		bound: ONE_TRACK,
		step: TRACK_STEP,
		message: LAYOUT_MESSAGE,
		read: (layer) => (layer.layout.kind === "grid" ? layer.layout[key] : 1),
		patch: (value) => ({ layout: { ...layout, [key]: Math.round(value) } }),
	};
	return field;
}

export function layoutGroupsOf(layout: Layout): readonly FieldGroup[] {
	if (layout.kind === "free") {
		return [];
	}
	const spacing = {
		name: "Spacing",
		fields: [spaceField("Gap", "gap", layout), spaceField("Padding", "padding", layout)],
	};
	if (layout.kind === "flex") {
		return [spacing];
	}
	const tracks = {
		name: "Tracks",
		fields: [trackField("Columns", "columns", layout), trackField("Rows", "rows", layout)],
	};
	return [tracks, spacing];
}

function cellWith(slot: Cell, key: keyof Cell, value: number): Cell {
	const index = Math.round(value) - 1;
	return key === "column" ? { column: index, row: slot.row } : { column: slot.column, row: index };
}

function cellField(label: string, key: keyof Cell, count: number, slot: Cell): LayerField {
	return {
		label,
		unit: NO_UNIT,
		choice: null,
		bound: { kind: "clamp", min: 1, max: count },
		step: TRACK_STEP,
		message: CELL_MESSAGE,
		read: (layer) => (layer.slot?.[key] ?? 0) + 1,
		patch: (value) => ({ cell: cellWith(slot, key, value) }),
	};
}

export function cellGroupOf(layer: Layer, container: Layer | null): FieldGroup | null {
	if (container === null || container.layout.kind !== "grid") {
		return null;
	}
	const tracks = gridTracks(container, container.layout);
	const slot = layer.slot ?? { column: 0, row: 0 };
	return {
		name: "Cell",
		fields: [
			cellField("Column", "column", tracks.columns, slot),
			cellField("Row", "row", tracks.rows, slot),
		],
	};
}

function withGuides(guides: readonly Guide[]): LayerPatch {
	return { guides };
}

export function guideField(layer: Layer, index: number): LayerField {
	const guide = layer.guides[index];
	const label = guide === undefined ? "Guide" : GUIDE_LABELS[guide.axis];
	return {
		label,
		unit: PIXELS,
		choice: null,
		bound: { kind: "clamp", min: -SPACE_LIMIT, max: SPACE_LIMIT },
		step: LENGTH_STEP,
		message: GUIDE_MESSAGE,
		read: (held) => held.guides[index]?.at ?? 0,
		patch: (value) =>
			withGuides(layer.guides.map((held, at) => (at === index ? { ...held, at: value } : held))),
	};
}

export function addedGuide(layer: Layer, axis: GuideAxis): LayerPatch {
	const at = axis === "x" ? layer.width / 2 : layer.height / 2;
	return withGuides([...layer.guides, { axis, at: Math.round(at) }]);
}

export function removedGuide(layer: Layer, index: number): LayerPatch {
	return withGuides(layer.guides.filter((_, at) => at !== index));
}

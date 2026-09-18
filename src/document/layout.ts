import { bagOf, listOf } from "./bag";

export const SPACING_UNITS = ["px", "rem", "%"] as const;

export type SpacingUnit = (typeof SPACING_UNITS)[number];

export interface Spacing {
	value: number;
	unit: SpacingUnit;
}

export const MARGIN_UNITS = ["px", "rem", "%", "auto"] as const;

export type MarginSide = Spacing | { unit: "auto" };

export const TRACK_UNITS = ["fr", "px", "rem", "%", "auto"] as const;

export type TrackUnit = (typeof TRACK_UNITS)[number];

export type Track = { value: number; unit: Exclude<TrackUnit, "auto"> } | { unit: "auto" };

export type SizeMode = "fixed" | "hug" | "fill";

export type PositionMode = "offset" | "absolute";

export type DisplayMode = "block" | "row" | "column" | "grid";

export type Distribute = "pack" | "between" | "around" | "evenly";

export type Alignment = "start" | "center" | "end";

export type Side = "top" | "right" | "bottom" | "left";

export const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

export interface Span {
	start: number;
	end: number;
}

export type Placement = { mode: "auto" } | { mode: "place"; column: Span; row: Span };

export interface LayerLayout {
	width: SizeMode;
	height: SizeMode;
	position: PositionMode;
	margin: Record<Side, MarginSide>;
	padding: Record<Side, Spacing>;
	cell: Placement;
	display: DisplayMode;
	wrap: boolean;
	distribute: Distribute;
	align: { main: Alignment; cross: Alignment };
	gap: { column: Spacing; row: Spacing };
	tracks: { columns: readonly Track[]; rows: readonly Track[] };
}

export type LayoutPatch = Partial<LayerLayout>;

export const SIZE_MODES: readonly SizeMode[] = ["fixed", "hug", "fill"];
const POSITION_MODES: readonly PositionMode[] = ["offset", "absolute"];
export const DISPLAY_MODES: readonly DisplayMode[] = ["block", "row", "column", "grid"];
export const DISTRIBUTIONS: readonly Distribute[] = ["pack", "between", "around", "evenly"];
export const ALIGNMENTS: readonly Alignment[] = ["start", "center", "end"];
const FIRST_LINE = 1;
const SECOND_LINE = 2;
const COLUMN_COUNT = 3;
const ROW_COUNT = 2;

function oneOf<T extends string>(choices: readonly T[], value: unknown, fallback: T): T {
	return choices.find((choice) => choice === value) ?? fallback;
}

function numberOf(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function spacingOf(value: unknown): Spacing {
	const bag = bagOf(value);
	return { value: numberOf(bag["value"], 0), unit: oneOf(SPACING_UNITS, bag["unit"], "px") };
}

function marginOf(value: unknown): MarginSide {
	const bag = bagOf(value);
	const unit = oneOf(MARGIN_UNITS, bag["unit"], "px");
	return unit === "auto" ? { unit } : { value: numberOf(bag["value"], 0), unit };
}

function trackOf(value: unknown): Track {
	const bag = bagOf(value);
	const unit = oneOf(TRACK_UNITS, bag["unit"], "fr");
	return unit === "auto" ? { unit } : { value: numberOf(bag["value"], 1), unit };
}

function trackRun(count: number): readonly Track[] {
	return Array.from({ length: count }, (): Track => ({ value: 1, unit: "fr" }));
}

function trackListOf(value: unknown, count: number): readonly Track[] {
	const list = listOf(value);
	return list.length === 0 ? trackRun(count) : list.map((track) => trackOf(track));
}

function tracksOf(value: unknown): LayerLayout["tracks"] {
	const bag = bagOf(value);
	return {
		columns: trackListOf(bag["columns"], COLUMN_COUNT),
		rows: trackListOf(bag["rows"], ROW_COUNT),
	};
}

function isLine(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= FIRST_LINE;
}

function spanOf(value: unknown): Span {
	const bag = bagOf(value);
	const start = bag["start"];
	const end = bag["end"];
	return isLine(start) && isLine(end) && end > start
		? { start, end }
		: { start: FIRST_LINE, end: SECOND_LINE };
}

function placementOf(value: unknown): Placement {
	const bag = bagOf(value);
	return bag["mode"] === "place"
		? { mode: "place", column: spanOf(bag["column"]), row: spanOf(bag["row"]) }
		: { mode: "auto" };
}

function sidesOf<T>(value: unknown, read: (side: unknown) => T): Record<Side, T> {
	const bag = bagOf(value);
	return {
		top: read(bag["top"]),
		right: read(bag["right"]),
		bottom: read(bag["bottom"]),
		left: read(bag["left"]),
	};
}

function alignOf(value: unknown): LayerLayout["align"] {
	const bag = bagOf(value);
	return {
		main: oneOf(ALIGNMENTS, bag["main"], "start"),
		cross: oneOf(ALIGNMENTS, bag["cross"], "start"),
	};
}

function gapOf(value: unknown): LayerLayout["gap"] {
	const bag = bagOf(value);
	return { column: spacingOf(bag["column"]), row: spacingOf(bag["row"]) };
}

export function layoutOf(value: unknown): LayerLayout {
	const bag = bagOf(value);
	return {
		width: oneOf(SIZE_MODES, bag["width"], "fixed"),
		height: oneOf(SIZE_MODES, bag["height"], "fixed"),
		position: oneOf(POSITION_MODES, bag["position"], "offset"),
		margin: sidesOf(bag["margin"], marginOf),
		padding: sidesOf(bag["padding"], spacingOf),
		cell: placementOf(bag["cell"]),
		display: oneOf(DISPLAY_MODES, bag["display"], "block"),
		wrap: bag["wrap"] === true,
		distribute: oneOf(DISTRIBUTIONS, bag["distribute"], "pack"),
		align: alignOf(bag["align"]),
		gap: gapOf(bag["gap"]),
		tracks: tracksOf(bag["tracks"]),
	};
}

export const DEFAULT_LAYOUT: LayerLayout = layoutOf({});

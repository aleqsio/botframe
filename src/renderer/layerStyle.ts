import type { CSSProperties } from "react";
import type { Geometry, Origin, Rect } from "../document/layer";
import { SIDES } from "../document/layout";
import type {
	Alignment,
	DisplayMode,
	Distribute,
	LayerLayout,
	MarginSide,
	Placement,
	PositionMode,
	Side,
	Spacing,
	Span,
	Track,
} from "../document/layout";
import { PERCENT, roundNumber } from "../document/length";
import type { Axis } from "../document/length";
import { pivotOf, turnedBounds } from "./input/layerSpace";
import type { Turned } from "./input/layerSpace";

declare module "react" {
	interface CSSProperties {
		cornerShape?: string | undefined;
	}
}

export interface StyledLayer extends Rect, Turned {
	fill: string;
	clip: boolean;
	geometry: Geometry;
	layout: LayerLayout;
}

interface ParentFlow {
	display: DisplayMode;
	outOfFlow: boolean;
}

const FLEX_ALIGN: Readonly<Record<Alignment, string>> = {
	start: "flex-start",
	center: "center",
	end: "flex-end",
};

const SPREAD: Readonly<Record<Distribute, string | null>> = {
	pack: null,
	between: "space-between",
	around: "space-around",
	evenly: "space-evenly",
};

const DISPLAY_BASE: Readonly<Record<DisplayMode, CSSProperties>> = {
	block: { display: "block" },
	row: { display: "flex" },
	column: { display: "flex", flexDirection: "column" },
	grid: { display: "grid" },
};

const SIZE_TEXT: Readonly<Record<Axis, (text: string) => CSSProperties>> = {
	width: (text) => ({ width: text }),
	height: (text) => ({ height: text }),
};

const MARGIN_TEXT: Readonly<Record<Side, (text: string) => CSSProperties>> = {
	top: (text) => ({ marginTop: text }),
	right: (text) => ({ marginRight: text }),
	bottom: (text) => ({ marginBottom: text }),
	left: (text) => ({ marginLeft: text }),
};

function printSpacing(spacing: Spacing): string {
	return `${spacing.value}${spacing.unit}`;
}

function cornerShape(cornerSmoothing: number): string | undefined {
	return cornerSmoothing > 0 ? `superellipse(${2 + cornerSmoothing * 3})` : undefined;
}

function geometryStyle(geometry: Geometry): CSSProperties {
	switch (geometry.kind) {
		case "rectangle": {
			return {
				borderRadius: `${geometry.cornerRadius}px`,
				cornerShape: cornerShape(geometry.cornerSmoothing),
			};
		}
		case "ellipse": {
			return { borderRadius: "50%" };
		}
		case "path": {
			return { clipPath: `path("${geometry.d}")` };
		}
		case "unsupported": {
			break;
		}
	}
	return {};
}

function isPosed(layer: Turned): boolean {
	return layer.rotation !== 0 || layer.mirrored;
}

function turnText(layer: Turned): string {
	const turn = `rotate(${layer.rotation}deg)`;
	return layer.mirrored ? `${turn} scaleX(-1)` : turn;
}

function turnAbout(layer: Turned): string {
	const pivot = pivotOf(layer);
	const turn = turnText(layer);
	return `translate(${pivot.x}px, ${pivot.y}px) ${turn} translate(${-pivot.x}px, ${-pivot.y}px)`;
}

function placeText(layer: Rect): string {
	return `translate3d(${layer.x}px, ${layer.y}px, 0)`;
}

function layerTransform(layer: Rect & Turned): string {
	return isPosed(layer) ? `${placeText(layer)} ${turnText(layer)}` : placeText(layer);
}

export function spaceTransform(layer: Rect & Turned): string {
	return isPosed(layer) ? `${placeText(layer)} ${turnAbout(layer)}` : placeText(layer);
}

export function originPlace(origin: Origin): { left: string; top: string } {
	return { left: `${origin.x * PERCENT}%`, top: `${origin.y * PERCENT}%` };
}

function originStyle(layer: Turned): CSSProperties {
	if (!isPosed(layer)) {
		return {};
	}
	const { left, top } = originPlace(layer.origin);
	return { transformOrigin: `${left} ${top}` };
}

export function outOfFlow(parentDisplay: DisplayMode | null, position: PositionMode): boolean {
	return parentDisplay === null || parentDisplay === "block" || position === "absolute";
}

function flowOf(layout: LayerLayout, parentDisplay: DisplayMode | null): ParentFlow {
	return {
		display: parentDisplay ?? "block",
		outOfFlow: outOfFlow(parentDisplay, layout.position),
	};
}

function offsetStyle(layer: StyledLayer): CSSProperties {
	if (layer.layout.position === "default") {
		return {};
	}
	return {
		...(layer.x === 0 ? {} : { left: `${layer.x}px` }),
		...(layer.y === 0 ? {} : { top: `${layer.y}px` }),
	};
}

function placeStyle(layer: StyledLayer, flow: ParentFlow): CSSProperties {
	if (flow.outOfFlow) {
		return { position: "absolute", transform: layerTransform(layer), ...originStyle(layer) };
	}
	return {
		position: "relative",
		...offsetStyle(layer),
		transform: isPosed(layer) ? turnText(layer) : undefined,
		...originStyle(layer),
	};
}

function onMainAxis(axis: Axis, display: DisplayMode): boolean {
	return (axis === "width") === (display === "row");
}

function fillStyle(axis: Axis, flow: ParentFlow): CSSProperties {
	if (flow.outOfFlow) {
		return SIZE_TEXT[axis]("100%");
	}
	if (flow.display === "grid") {
		return axis === "width" ? { justifySelf: "stretch" } : { alignSelf: "stretch" };
	}
	return onMainAxis(axis, flow.display) ? { flex: "1 1 0%" } : { alignSelf: "stretch" };
}

function shrinkStyle(axis: Axis, flow: ParentFlow): CSSProperties {
	if (flow.outOfFlow || flow.display === "grid" || !onMainAxis(axis, flow.display)) {
		return {};
	}
	return { flexShrink: 0 };
}

function axisStyle(axis: Axis, layer: StyledLayer, flow: ParentFlow): CSSProperties {
	const mode = layer.layout[axis];
	if (mode === "fill") {
		return fillStyle(axis, flow);
	}
	const text = mode === "fixed" ? `${layer[axis]}px` : "fit-content";
	return { ...SIZE_TEXT[axis](text), ...shrinkStyle(axis, flow) };
}

function spanText(span: Span): string {
	return `${span.start} / ${span.end}`;
}

function cellStyle(cell: Placement, flow: ParentFlow): CSSProperties {
	if (flow.outOfFlow || flow.display !== "grid" || cell.mode === "auto") {
		return {};
	}
	return { gridColumn: spanText(cell.column), gridRow: spanText(cell.row) };
}

function marginText(side: MarginSide): string | null {
	if (side.unit === "auto") {
		return "auto";
	}
	return side.value === 0 ? null : printSpacing(side);
}

export function turnedPad(layer: StyledLayer): Record<Side, number> {
	const bounds = turnedBounds(layer);
	return {
		top: roundNumber(-bounds.y),
		right: roundNumber(bounds.x + bounds.width - layer.width),
		bottom: roundNumber(bounds.y + bounds.height - layer.height),
		left: roundNumber(-bounds.x),
	};
}

const NO_PAD: Record<Side, number> = { top: 0, right: 0, bottom: 0, left: 0 };

function paddedMargin(text: string | null, pad: number): string | null {
	if (pad === 0 || text === "auto") {
		return text;
	}
	return text === null ? `${pad}px` : `calc(${text} + ${pad}px)`;
}

function marginStyle(layer: StyledLayer, flow: ParentFlow): CSSProperties {
	if (flow.outOfFlow) {
		return {};
	}
	const pad = layer.layout.turnedBox ? turnedPad(layer) : NO_PAD;
	const style: CSSProperties = {};
	for (const side of SIDES) {
		const text = paddedMargin(marginText(layer.layout.margin[side]), pad[side]);
		if (text !== null) {
			Object.assign(style, MARGIN_TEXT[side](text));
		}
	}
	return style;
}

function selfStyle(layer: StyledLayer, parentDisplay: DisplayMode | null): CSSProperties {
	const flow = flowOf(layer.layout, parentDisplay);
	return {
		...placeStyle(layer, flow),
		...axisStyle("width", layer, flow),
		...axisStyle("height", layer, flow),
		...cellStyle(layer.layout.cell, flow),
		...marginStyle(layer, flow),
	};
}

export function trackText(track: Track): string {
	return track.unit === "auto" ? "auto" : `${track.value}${track.unit}`;
}

function axisTemplate(tracks: readonly Track[]): string {
	const texts = tracks.map((track) => trackText(track));
	const [first = ""] = texts;
	return texts.every((text) => text === first)
		? `repeat(${texts.length}, ${first})`
		: texts.join(" ");
}

function displayStyle(layout: LayerLayout): CSSProperties {
	const base = DISPLAY_BASE[layout.display];
	if (layout.display === "grid") {
		return {
			...base,
			gridTemplateColumns: axisTemplate(layout.tracks.columns),
			gridTemplateRows: axisTemplate(layout.tracks.rows),
		};
	}
	return layout.wrap && layout.display !== "block" ? { ...base, flexWrap: "wrap" } : base;
}

export function alignStyle(layout: LayerLayout): CSSProperties {
	const spread = SPREAD[layout.distribute];
	if (layout.display === "grid") {
		const items = {
			justifyItems: layout.align.main,
			alignItems: layout.align.cross,
		};
		return spread === null ? items : { ...items, justifyContent: spread };
	}
	const justifyContent = spread ?? FLEX_ALIGN[layout.align.main];
	const cross = FLEX_ALIGN[layout.align.cross];
	return layout.wrap
		? { justifyContent, alignContent: cross }
		: { justifyContent, alignItems: cross };
}

function gapStyle(layout: LayerLayout): CSSProperties {
	const { column, row } = layout.gap;
	if (layout.display !== "grid" && !layout.wrap) {
		return column.value === 0 ? {} : { gap: printSpacing(column) };
	}
	return column.value === 0 && row.value === 0
		? {}
		: { gap: `${printSpacing(row)} ${printSpacing(column)}` };
}

function paddingStyle(padding: Record<Side, Spacing>): CSSProperties {
	if (SIDES.every((side) => padding[side].value === 0)) {
		return {};
	}
	const texts = SIDES.map((side) => printSpacing(padding[side]));
	const top = printSpacing(padding.top);
	return { padding: texts.every((text) => text === top) ? top : texts.join(" ") };
}

function containerStyle(layout: LayerLayout): CSSProperties {
	const children = layout.display === "block" ? {} : { ...alignStyle(layout), ...gapStyle(layout) };
	return { ...displayStyle(layout), ...children, ...paddingStyle(layout.padding) };
}

export function layerStyle(layer: StyledLayer, parentDisplay: DisplayMode | null): CSSProperties {
	return {
		...selfStyle(layer, parentDisplay),
		...containerStyle(layer.layout),
		background: layer.fill,
		overflow: layer.clip ? "hidden" : undefined,
		...geometryStyle(layer.geometry),
	};
}

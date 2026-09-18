import type { CSSProperties } from "react";
import type { Geometry, Rect } from "../document/layer";
import { SIDES } from "../document/layout";
import type {
	Alignment,
	DisplayMode,
	Distribute,
	LayerLayout,
	MarginSide,
	Placement,
	Side,
	Spacing,
	Span,
	Track,
} from "../document/layout";
import type { Axis } from "../document/length";
import { halfSizeOf } from "./input/layerSpace";

declare module "react" {
	interface CSSProperties {
		cornerShape?: string | undefined;
	}
}

export interface StyledLayer extends Rect {
	rotation: number;
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

function turnAbout(layer: StyledLayer): string {
	const half = halfSizeOf(layer);
	const turn = `rotate(${layer.rotation}deg)`;
	return `translate(${half.x}px, ${half.y}px) ${turn} translate(${-half.x}px, ${-half.y}px)`;
}

export function layerTransform(layer: StyledLayer): string {
	const place = `translate3d(${layer.x}px, ${layer.y}px, 0)`;
	return layer.rotation === 0 ? place : `${place} ${turnAbout(layer)}`;
}

function flowOf(layout: LayerLayout, parent: LayerLayout | null): ParentFlow {
	const display = parent?.display ?? "block";
	return { display, outOfFlow: display === "block" || layout.position === "absolute" };
}

function placeStyle(layer: StyledLayer, flow: ParentFlow): CSSProperties {
	if (flow.outOfFlow) {
		return { transform: layerTransform(layer) };
	}
	return {
		position: "relative",
		...(layer.x === 0 ? {} : { left: `${layer.x}px` }),
		...(layer.y === 0 ? {} : { top: `${layer.y}px` }),
		transform: layer.rotation === 0 ? undefined : turnAbout(layer),
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

function axisStyle(axis: Axis, layer: StyledLayer, flow: ParentFlow): CSSProperties {
	const mode = layer.layout[axis];
	if (mode === "fixed") {
		return SIZE_TEXT[axis](`${layer[axis]}px`);
	}
	return mode === "hug" ? SIZE_TEXT[axis]("fit-content") : fillStyle(axis, flow);
}

function spanText(span: Span): string {
	return `${span.start} / ${span.end}`;
}

function cellStyle(cell: Placement, flow: ParentFlow): CSSProperties {
	if (flow.display !== "grid" || cell.mode === "auto") {
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

function marginStyle(margin: Record<Side, MarginSide>, flow: ParentFlow): CSSProperties {
	if (flow.display === "block") {
		return {};
	}
	const style: CSSProperties = {};
	for (const side of SIDES) {
		const text = marginText(margin[side]);
		if (text !== null) {
			Object.assign(style, MARGIN_TEXT[side](text));
		}
	}
	return style;
}

function selfStyle(layer: StyledLayer, parent: LayerLayout | null): CSSProperties {
	const flow = flowOf(layer.layout, parent);
	return {
		...placeStyle(layer, flow),
		...axisStyle("width", layer, flow),
		...axisStyle("height", layer, flow),
		...cellStyle(layer.layout.cell, flow),
		...marginStyle(layer.layout.margin, flow),
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

export function layerStyle(layer: StyledLayer, parent: StyledLayer | null): CSSProperties {
	return {
		...selfStyle(layer, parent?.layout ?? null),
		...containerStyle(layer.layout),
		background: layer.fill,
		overflow: layer.clip ? "hidden" : undefined,
		...geometryStyle(layer.geometry),
	};
}

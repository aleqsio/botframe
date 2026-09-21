import type { Layer, LayerId, Rect } from "../../document/layer";
import { SIDES } from "../../document/layout";
import type { DisplayMode, Side } from "../../document/layout";
import { outOfFlow } from "../layerStyle";
import { LAYER_ATTRIBUTE, isLayerId } from "./hitTest";
import type { ReadLayer } from "./layerSpace";

type Inset = Readonly<Record<Side, number>>;

interface DrawnGrid {
	columns: readonly number[];
	rows: readonly number[];
	columnGap: number;
	rowGap: number;
}

export interface DrawnBox extends Rect {
	placed: boolean;
}

export interface DrawnReader {
	box: (layer: Layer) => DrawnBox | null;
	inset: (id: LayerId) => Inset;
	grid: (id: LayerId) => DrawnGrid;
}

const NO_INSET: Inset = { top: 0, right: 0, bottom: 0, left: 0 };
const NO_GRID: DrawnGrid = { columns: [], rows: [], columnGap: 0, rowGap: 0 };

export const NO_DRAWN: DrawnReader = {
	box: () => null,
	inset: () => NO_INSET,
	grid: () => NO_GRID,
};

export function drawnFrom(
	layer: Layer,
	parentDisplay: DisplayMode | null,
	box: DrawnBox | null,
): Layer {
	if (box === null) {
		return layer;
	}
	const placed = box.placed && !outOfFlow(parentDisplay, layer.layout.position);
	return {
		...layer,
		...(placed ? { x: box.x, y: box.y } : {}),
		...(layer.layout.width === "fixed" ? {} : { width: box.width }),
		...(layer.layout.height === "fixed" ? {} : { height: box.height }),
	};
}

function elementOf(id: LayerId): HTMLElement | null {
	if (typeof document === "undefined") {
		return null;
	}
	const element = document.querySelector(`[${LAYER_ATTRIBUTE}="${id}"]`);
	return element instanceof HTMLElement ? element : null;
}

function parentLayerIdOf(element: HTMLElement): LayerId | null {
	const value = element.parentElement?.getAttribute(LAYER_ATTRIBUTE) ?? null;
	return value !== null && isLayerId(value) ? value : null;
}

function pixelsOf(text: string): number {
	const value = Number.parseFloat(text);
	return Number.isFinite(value) ? value : 0;
}

function pixelList(text: string): number[] {
	return text.split(" ").flatMap((part) => (part.endsWith("px") ? [pixelsOf(part)] : []));
}

function domBox(layer: Layer): DrawnBox | null {
	const element = elementOf(layer.id);
	if (element === null) {
		return null;
	}
	return {
		x: element.offsetLeft,
		y: element.offsetTop,
		width: element.offsetWidth,
		height: element.offsetHeight,
		placed: parentLayerIdOf(element) === layer.parent,
	};
}

function domInset(id: LayerId): Inset {
	const element = elementOf(id);
	if (element === null) {
		return NO_INSET;
	}
	const style = getComputedStyle(element);
	return {
		top: pixelsOf(style.paddingTop),
		right: pixelsOf(style.paddingRight),
		bottom: pixelsOf(style.paddingBottom),
		left: pixelsOf(style.paddingLeft),
	};
}

function domGrid(id: LayerId): DrawnGrid {
	const element = elementOf(id);
	if (element === null) {
		return NO_GRID;
	}
	const style = getComputedStyle(element);
	return {
		columns: pixelList(style.gridTemplateColumns),
		rows: pixelList(style.gridTemplateRows),
		columnGap: pixelsOf(style.columnGap),
		rowGap: pixelsOf(style.rowGap),
	};
}

export const DOM_DRAWN: DrawnReader = { box: domBox, inset: domInset, grid: domGrid };

export function drawnPadding(id: LayerId): string {
	const inset = DOM_DRAWN.inset(id);
	return SIDES.map((side) => `${inset[side]}px`).join(" ");
}

function drawnLayer(drawn: DrawnReader, read: ReadLayer, layer: Layer): Layer {
	const parent = layer.parent === null ? null : read(layer.parent);
	return drawnFrom(layer, parent?.layout.display ?? null, drawn.box(layer));
}

export function drawnRead(drawn: DrawnReader, read: ReadLayer): ReadLayer {
	return (id) => {
		const layer = read(id);
		return layer === null ? null : drawnLayer(drawn, read, layer);
	};
}

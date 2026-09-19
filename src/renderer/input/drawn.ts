import type { Layer, LayerId, Rect } from "../../document/layer";
import { SIDES } from "../../document/layout";
import type { DisplayMode, Side } from "../../document/layout";
import { outOfFlow } from "../layerStyle";
import type { ReadLayer } from "./layerSpace";

export function drawnFrom(
	layer: Layer,
	parentDisplay: DisplayMode | null,
	box: Rect | null,
): Layer {
	if (box === null) {
		return layer;
	}
	return {
		...layer,
		...(outOfFlow(parentDisplay, layer.layout.position) ? {} : { x: box.x, y: box.y }),
		...(layer.layout.width === "fixed" ? {} : { width: box.width }),
		...(layer.layout.height === "fixed" ? {} : { height: box.height }),
	};
}

const NO_INSET: Readonly<Record<Side, number>> = { top: 0, right: 0, bottom: 0, left: 0 };

function elementOf(id: LayerId): HTMLElement | null {
	if (typeof document === "undefined") {
		return null;
	}
	const element = document.querySelector(`[data-layer-id="${id}"]`);
	return element instanceof HTMLElement ? element : null;
}

function pixelsOf(text: string): number {
	const value = Number.parseFloat(text);
	return Number.isFinite(value) ? value : 0;
}

export function drawnInset(id: LayerId): Readonly<Record<Side, number>> {
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

export function drawnPadding(id: LayerId): string {
	const inset = drawnInset(id);
	return SIDES.map((side) => `${inset[side]}px`).join(" ");
}

function boxOf(id: LayerId): Rect | null {
	const element = elementOf(id);
	if (element === null) {
		return null;
	}
	return {
		x: element.offsetLeft,
		y: element.offsetTop,
		width: element.offsetWidth,
		height: element.offsetHeight,
	};
}

export function drawnLayer(read: ReadLayer, layer: Layer): Layer {
	const parent = layer.parent === null ? null : read(layer.parent);
	return drawnFrom(layer, parent?.layout.display ?? null, boxOf(layer.id));
}

export function drawnRead(read: ReadLayer): ReadLayer {
	return (id) => {
		const layer = read(id);
		return layer === null ? null : drawnLayer(read, layer);
	};
}

import type { Layer, LayerId, Rect } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
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

const NO_PADDING = "0px 0px 0px 0px";
const PADDING_SIDES = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const;

function elementOf(id: LayerId): HTMLElement | null {
	if (typeof document === "undefined") {
		return null;
	}
	const element = document.querySelector(`[data-layer-id="${id}"]`);
	return element instanceof HTMLElement ? element : null;
}

export function drawnPadding(id: LayerId): string {
	const element = elementOf(id);
	if (element === null) {
		return NO_PADDING;
	}
	const style = getComputedStyle(element);
	return PADDING_SIDES.map((side) => style[side]).join(" ");
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

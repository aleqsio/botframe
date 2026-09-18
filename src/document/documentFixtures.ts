import type { DesignDocument } from "./document";
import type { Layer, LayerFields, LayerId, Rect } from "./layer";
import { PIXELS } from "./length";
import type { LayerLengths } from "./length";
import { FREE_LAYOUT, NO_GUIDES } from "./layout";
import type { LayerNode } from "./subtree";

export function firstId(doc: DesignDocument): LayerId {
	const [id] = doc.layerIds();
	if (id === undefined) {
		throw new Error("document has no layers");
	}
	return id;
}

export const DRAWN: LayerFields = {
	x: 12,
	y: 34,
	width: 56,
	height: 78,
	fill: "#ffffff",
	name: "Artboard 1",
	clip: true,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
};

function pixelLengths(rect: Rect): LayerLengths {
	return {
		x: { value: rect.x, unit: PIXELS },
		y: { value: rect.y, unit: PIXELS },
		width: { value: rect.width, unit: PIXELS },
		height: { value: rect.height, unit: PIXELS },
	};
}

export function nodeBox(rect: Rect): Pick<LayerNode, "lengths" | "layout" | "cell" | "guides"> {
	return { lengths: pixelLengths(rect), layout: FREE_LAYOUT, cell: null, guides: NO_GUIDES };
}

export function pixelBox(
	rect: Rect,
): Pick<Layer, "lengths" | "layout" | "cell" | "slot" | "guides"> {
	return { ...nodeBox(rect), slot: null };
}

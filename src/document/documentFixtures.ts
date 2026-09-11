import type { DesignDocument } from "./document";
import type { Layer, LayerFields, LayerId, Rect } from "./layer";
import { NO_BASIS, PIXELS } from "./length";
import type { LayerLengths } from "./length";

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

export function pixelLengths(rect: Rect): LayerLengths {
	return {
		x: { value: rect.x, unit: PIXELS },
		y: { value: rect.y, unit: PIXELS },
		width: { value: rect.width, unit: PIXELS },
		height: { value: rect.height, unit: PIXELS },
	};
}

export function pixelBox(rect: Rect): Pick<Layer, "lengths" | "basis"> {
	return { lengths: pixelLengths(rect), basis: NO_BASIS };
}

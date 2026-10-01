import { NO_BINDINGS } from "./bindings";
import type { Bindings } from "./bindings";
import type { DesignDocument } from "./document";
import { NO_GUIDES } from "./guides";
import type { Guide } from "./guides";
import { CENTER_ORIGIN, NO_CONTENT } from "./layer";
import type { LayerContent, LayerFields, LayerId, Origin, Rect } from "./layer";
import { DEFAULT_LAYOUT } from "./layout";
import type { LayerLayout } from "./layout";
import { PIXELS } from "./length";
import type { LayerLengths } from "./length";
import type { MediaFill } from "./media";

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
	name: "Frame 1",
	clip: true,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
};

function pixelLengths(rect: Rect): LayerLengths {
	return {
		x: { value: rect.x, unit: PIXELS },
		y: { value: rect.y, unit: PIXELS },
		width: { value: rect.width, unit: PIXELS },
		height: { value: rect.height, unit: PIXELS },
	};
}

export interface PixelBox {
	lengths: LayerLengths;
	layout: LayerLayout;
	guides: readonly Guide[];
	origin: Origin;
	media: MediaFill | null;
	content: LayerContent;
	bindings: Bindings;
}

export function nodeBox(rect: Rect): PixelBox {
	return {
		lengths: pixelLengths(rect),
		layout: DEFAULT_LAYOUT,
		guides: NO_GUIDES,
		origin: CENTER_ORIGIN,
		media: null,
		content: NO_CONTENT,
		bindings: NO_BINDINGS,
	};
}

export function pixelBox(rect: Rect): PixelBox & { changed: readonly string[] } {
	return { ...nodeBox(rect), changed: [] };
}

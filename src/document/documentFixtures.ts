import type { DesignDocument } from "./document";
import type { LayerFields, LayerId } from "./layer";

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

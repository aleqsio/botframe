import type { Geometry, Layer } from "../../document/layer";

const GEOMETRY_LABELS: Readonly<Record<Geometry["kind"], string>> = {
	rectangle: "Rectangle",
	ellipse: "Ellipse",
	path: "Path",
	unsupported: "Layer",
};

export interface LayerEntry {
	label: string;
	swatch: string;
}

export function layerEntry(layer: Layer | null): LayerEntry {
	if (layer === null) {
		return { label: GEOMETRY_LABELS.unsupported, swatch: "transparent" };
	}
	return { label: GEOMETRY_LABELS[layer.geometry.kind], swatch: layer.fill };
}

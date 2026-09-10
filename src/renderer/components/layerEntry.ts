import type { Geometry, Layer } from "../../document/layer";

const GEOMETRY_LABELS: Readonly<Record<Geometry["kind"], string>> = {
	rectangle: "Rectangle",
	ellipse: "Ellipse",
	path: "Path",
	unsupported: "Layer",
};

const ARTBOARD_LABEL = "Artboard";

export interface LayerEntry {
	label: string;
	swatch: string;
}

function kindLabel(layer: Layer | null): string {
	if (layer === null) {
		return GEOMETRY_LABELS.unsupported;
	}
	const { geometry } = layer;
	if (geometry.kind === "rectangle" && geometry.artboard) {
		return ARTBOARD_LABEL;
	}
	return GEOMETRY_LABELS[geometry.kind];
}

export function layerEntry(layer: Layer | null): LayerEntry {
	if (layer === null) {
		return { label: GEOMETRY_LABELS.unsupported, swatch: "transparent" };
	}
	return { label: layer.name === "" ? kindLabel(layer) : layer.name, swatch: layer.fill };
}

export function nextLayerName(label: string, layers: Iterable<Layer | null>): string {
	let count = 0;
	for (const layer of layers) {
		if (kindLabel(layer) === label) {
			count += 1;
		}
	}
	return `${label} ${count + 1}`;
}

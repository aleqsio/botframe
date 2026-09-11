import type { Geometry, Layer } from "../../document/layer";

const GEOMETRY_LABELS: Readonly<Record<Geometry["kind"], string>> = {
	rectangle: "Rectangle",
	ellipse: "Ellipse",
	path: "Path",
	unsupported: "Layer",
};

const ARTBOARD_LABEL = "Artboard";

export type LayerGlyph = "artboard" | "ellipse" | "rectangle";

export interface InspectorHeading {
	glyph: LayerGlyph | "page";
	name: string;
	kind: string;
}

const PAGE_HEADING: InspectorHeading = { glyph: "page", name: "Page", kind: "Nothing is selected" };

export interface LayerEntry {
	label: string;
	swatch: string;
}

export function isArtboard(layer: Layer | null): boolean {
	const geometry = layer?.geometry;
	return geometry?.kind === "rectangle" && geometry.artboard;
}

function kindLabel(layer: Layer | null): string {
	if (layer === null) {
		return GEOMETRY_LABELS.unsupported;
	}
	return isArtboard(layer) ? ARTBOARD_LABEL : GEOMETRY_LABELS[layer.geometry.kind];
}

export function layerEntry(layer: Layer | null): LayerEntry {
	if (layer === null) {
		return { label: GEOMETRY_LABELS.unsupported, swatch: "transparent" };
	}
	return { label: layer.name === "" ? kindLabel(layer) : layer.name, swatch: layer.fill };
}

export function glyphOf(layer: Layer | null): LayerGlyph {
	if (isArtboard(layer)) {
		return "artboard";
	}
	return layer?.geometry.kind === "ellipse" ? "ellipse" : "rectangle";
}

export function inspectorHeading(layer: Layer | null): InspectorHeading {
	if (layer === null) {
		return PAGE_HEADING;
	}
	return { glyph: glyphOf(layer), name: layerEntry(layer).label, kind: kindLabel(layer) };
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

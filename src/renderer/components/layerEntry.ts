import type { ComponentsView } from "../../document/components";
import type { Geometry, Layer } from "../../document/layer";

const GEOMETRY_LABELS: Readonly<Record<Geometry["kind"], string>> = {
	rectangle: "Rectangle",
	ellipse: "Ellipse",
	path: "Path",
	group: "Group",
	text: "Text",
	unsupported: "Layer",
};

const FRAME_LABEL = "Frame";
const COMPONENT_LABEL = "Component";
const CODE_LABEL = "Code component";

export type LayerGlyph =
	| "frame"
	| "ellipse"
	| "rectangle"
	| "text"
	| "component"
	| "code"
	| "group";

export interface InspectorHeading {
	glyph: LayerGlyph | "page";
	name: string;
	kind: string;
}

const PAGE_HEADING: InspectorHeading = { glyph: "page", name: "Page", kind: "Nothing is selected" };

const GROUP_KIND = "Selection";
const NAME_LENGTH = 24;

export interface LayerEntry {
	label: string;
	swatch: string;
}

export function isFrame(layer: Layer | null): boolean {
	const geometry = layer?.geometry;
	return geometry?.kind === "rectangle" && geometry.frame;
}

export function isRootFrame(layer: Layer | null): boolean {
	return layer !== null && layer.parent === null && isFrame(layer);
}

export function isCode(layer: Layer | null, view: Pick<ComponentsView, "entry">): boolean {
	const content = layer?.content;
	return content?.kind === "component" && view.entry(content.component)?.body.kind === "html";
}

function kindLabel(layer: Layer | null, code: boolean): string {
	if (layer === null) {
		return GEOMETRY_LABELS.unsupported;
	}
	if (layer.content.kind === "component") {
		return code ? CODE_LABEL : COMPONENT_LABEL;
	}
	return isFrame(layer) ? FRAME_LABEL : GEOMETRY_LABELS[layer.geometry.kind];
}

function textName(layer: Layer): string {
	const content = layer.geometry.kind === "text" ? layer.geometry.content : "";
	return content.trim().split("\n")[0]?.slice(0, NAME_LENGTH) ?? "";
}

function shownName(layer: Layer): string {
	if (layer.name !== "") {
		return layer.name;
	}
	return textName(layer) || kindLabel(layer, false);
}

export function layerEntry(layer: Layer | null): LayerEntry {
	if (layer === null) {
		return { label: GEOMETRY_LABELS.unsupported, swatch: "transparent" };
	}
	return { label: shownName(layer), swatch: layer.fill };
}

export function glyphOf(layer: Layer | null, code: boolean): LayerGlyph {
	if (layer?.content.kind === "component") {
		return code ? "code" : "component";
	}
	if (isFrame(layer)) {
		return "frame";
	}
	const kind = layer?.geometry.kind;
	return kind === "ellipse" || kind === "group" || kind === "text" ? kind : "rectangle";
}

export function inspectorHeading(layer: Layer | null, code: boolean): InspectorHeading {
	if (layer === null) {
		return PAGE_HEADING;
	}
	return {
		glyph: glyphOf(layer, code),
		name: layerEntry(layer).label,
		kind: kindLabel(layer, code),
	};
}

export function groupHeading(count: number): InspectorHeading {
	return { glyph: "group", name: `${count} layers`, kind: GROUP_KIND };
}

export function nextLayerName(label: string, layers: Iterable<Layer | null>): string {
	let count = 0;
	for (const layer of layers) {
		if (kindLabel(layer, false) === label || layer?.name.startsWith(`${label} `) === true) {
			count += 1;
		}
	}
	return `${label} ${count + 1}`;
}

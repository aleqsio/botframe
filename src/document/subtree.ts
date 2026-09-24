import { isCenterOrigin } from "./layer";
import type {
	Geometry,
	Layer,
	LayerFields,
	LayerId,
	LayerPatch,
	Origin,
	WritableGeometry,
} from "./layer";
import type { Guide } from "./guides";
import type { LayerLayout } from "./layout";
import { hasRelativeLength } from "./length";
import type { LayerLengths } from "./length";

export interface LayerNode {
	fields: LayerFields;
	rotation: number;
	mirrored: boolean;
	origin: Origin;
	lengths: LayerLengths;
	layout: LayerLayout;
	guides: readonly Guide[];
	children: readonly LayerNode[];
}

interface LayerReader {
	layer: (id: LayerId) => Layer | null;
	childIds: (parent: LayerId) => readonly LayerId[];
}

interface LayerWriter {
	createLayer: (fields: LayerFields, parent: LayerId | null) => LayerId;
	update: (id: LayerId, patch: LayerPatch) => void;
}

export const PLAIN_RECTANGLE: WritableGeometry = {
	kind: "rectangle",
	cornerRadius: 0,
	cornerSmoothing: 0,
	frame: false,
};

function writableGeometry(geometry: Geometry): WritableGeometry {
	return geometry.kind === "unsupported" ? PLAIN_RECTANGLE : geometry;
}

function fieldsOf(layer: Layer): LayerFields {
	return {
		x: layer.x,
		y: layer.y,
		width: layer.width,
		height: layer.height,
		fill: layer.fill,
		name: layer.name,
		clip: layer.clip,
		geometry: writableGeometry(layer.geometry),
	};
}

export function readSubtree(source: LayerReader, id: LayerId): LayerNode | null {
	const layer = source.layer(id);
	if (layer === null) {
		return null;
	}
	const children = source.childIds(id).flatMap((child) => readSubtree(source, child) ?? []);
	return {
		fields: fieldsOf(layer),
		rotation: layer.rotation,
		mirrored: layer.mirrored,
		origin: layer.origin,
		lengths: layer.lengths,
		layout: layer.layout,
		guides: layer.guides,
		children,
	};
}

function copyPatch(node: LayerNode): LayerPatch {
	return {
		...(node.rotation === 0 ? {} : { rotation: node.rotation }),
		...(node.mirrored ? { mirrored: true } : {}),
		...(isCenterOrigin(node.origin) ? {} : { origin: node.origin }),
		...(hasRelativeLength(node.lengths) ? { lengths: node.lengths } : {}),
		layout: node.layout,
		...(node.guides.length === 0 ? {} : { guides: node.guides }),
	};
}

export function createSubtree(sink: LayerWriter, node: LayerNode, parent: LayerId | null): LayerId {
	const id = sink.createLayer(node.fields, parent);
	sink.update(id, copyPatch(node));
	for (const child of node.children) {
		createSubtree(sink, child, id);
	}
	return id;
}

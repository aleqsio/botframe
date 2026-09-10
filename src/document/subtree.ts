import type { Geometry, Layer, LayerFields, LayerId, LayerPatch, WritableGeometry } from "./layer";

export interface LayerNode {
	fields: LayerFields;
	rotation: number;
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
	artboard: false,
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
	return { fields: fieldsOf(layer), rotation: layer.rotation, children };
}

export function createSubtree(sink: LayerWriter, node: LayerNode, parent: LayerId | null): LayerId {
	const id = sink.createLayer(node.fields, parent);
	if (node.rotation !== 0) {
		sink.update(id, { rotation: node.rotation });
	}
	for (const child of node.children) {
		createSubtree(sink, child, id);
	}
	return id;
}

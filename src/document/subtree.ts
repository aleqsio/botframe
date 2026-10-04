import type { Bindings } from "./bindings";
import { isCenterOrigin } from "./layer";
import type {
	Geometry,
	Layer,
	ComponentLink,
	LayerContent,
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
import type { MediaFill } from "./media";
import { copiesOf } from "./path";

export interface LayerNode {
	fields: LayerFields;
	rotation: number;
	skewX: number;
	skewY: number;
	mirrored: boolean;
	origin: Origin;
	lengths: LayerLengths;
	layout: LayerLayout;
	guides: readonly Guide[];
	media: MediaFill | null;
	content: LayerContent;
	bindings: Bindings;
	key?: LayerId | undefined;
	clipLayer?: LayerId | null | undefined;
	children: readonly LayerNode[];
}

interface LayerReader {
	layer: (id: LayerId) => Layer | null;
	childIds: (parent: LayerId) => readonly LayerId[];
	clipTargetsOf?: (id: LayerId) => readonly LayerId[];
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

function linkOf(content: ComponentLink): ComponentLink {
	const { component, instance, props } = content;
	return { kind: "component", component, props, instance };
}

export function ownChildIds(source: LayerReader, id: LayerId): readonly LayerId[] {
	const depth = copiesOf(id).length;
	return source.childIds(id).filter((child) => copiesOf(child).length === depth);
}

function clipLinksOf(source: LayerReader, layer: Layer): Pick<LayerNode, "key" | "clipLayer"> {
	const used = (source.clipTargetsOf?.(layer.id).length ?? 0) > 0;
	return {
		...(used ? { key: layer.id } : {}),
		...(layer.clipLayer === null ? {} : { clipLayer: layer.clipLayer }),
	};
}

export function readSubtree(source: LayerReader, id: LayerId): LayerNode | null {
	const layer = source.layer(id);
	if (layer === null) {
		return null;
	}
	const children = ownChildIds(source, id).flatMap((child) => readSubtree(source, child) ?? []);
	return {
		fields: fieldsOf(layer),
		rotation: layer.rotation,
		skewX: layer.skewX,
		skewY: layer.skewY,
		mirrored: layer.mirrored,
		origin: layer.origin,
		lengths: layer.lengths,
		layout: layer.layout,
		guides: layer.guides,
		media: layer.media,
		content: layer.content,
		bindings: layer.bindings,
		...clipLinksOf(source, layer),
		children,
	};
}

export function readTree(source: LayerReader, id: LayerId): LayerNode | null {
	const node = readSubtree(source, id);
	if (node === null) {
		return null;
	}
	const children = source.childIds(id).flatMap((child) => readTree(source, child) ?? []);
	return { ...node, children };
}

function posePatch(node: LayerNode): LayerPatch {
	return {
		...(node.rotation === 0 ? {} : { rotation: node.rotation }),
		...(node.skewX === 0 ? {} : { skewX: node.skewX }),
		...(node.skewY === 0 ? {} : { skewY: node.skewY }),
		...(node.mirrored ? { mirrored: true } : {}),
		...(isCenterOrigin(node.origin) ? {} : { origin: node.origin }),
	};
}

function copyPatch(node: LayerNode): LayerPatch {
	return {
		...posePatch(node),
		...(hasRelativeLength(node.lengths) ? { lengths: node.lengths } : {}),
		layout: node.layout,
		...(node.guides.length === 0 ? {} : { guides: node.guides }),
		...(node.media === null ? {} : { media: node.media }),
		...(node.content.kind === "none" ? {} : { content: linkOf(node.content) }),
		...(Object.keys(node.bindings).length === 0 ? {} : { bindings: node.bindings }),
	};
}

export function nodePatch(node: LayerNode): LayerPatch {
	return { ...node.fields, ...copyPatch(node) };
}

function createNodes(
	sink: LayerWriter,
	node: LayerNode,
	parent: LayerId | null,
	made: Map<LayerNode, LayerId>,
): LayerId {
	const id = sink.createLayer(node.fields, parent);
	sink.update(id, copyPatch(node));
	made.set(node, id);
	for (const child of node.children) {
		createNodes(sink, child, id, made);
	}
	return id;
}

function linkClips(sink: LayerWriter, made: ReadonlyMap<LayerNode, LayerId>): void {
	const renamed = new Map<LayerId, LayerId>();
	for (const [node, id] of made) {
		if (node.key !== undefined) {
			renamed.set(node.key, id);
		}
	}
	for (const [node, id] of made) {
		const clip = node.clipLayer ?? null;
		if (clip !== null) {
			sink.update(id, { clipLayer: renamed.get(clip) ?? clip });
		}
	}
}

export function createSubtree(sink: LayerWriter, node: LayerNode, parent: LayerId | null): LayerId {
	const made = new Map<LayerNode, LayerId>();
	const id = createNodes(sink, node, parent, made);
	linkClips(sink, made);
	return id;
}

export function componentIdsOf(nodes: readonly LayerNode[]): ReadonlySet<string> {
	const ids = new Set<string>();
	const pending = [...nodes];
	for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
		if (node.content.kind === "component") {
			ids.add(node.content.component);
		}
		pending.push(...node.children);
	}
	return ids;
}

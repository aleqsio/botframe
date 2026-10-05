import type { TreeID } from "loro-crdt";
import type { DesignDocument } from "./document";
import { holdsChildren } from "./layer";
import type { Layer, LayerId, LayerTraits } from "./layer";
import { copiesOf, layerPath, nodeOf } from "./path";
import type { Literal } from "./value";

type ReadLayer = (id: LayerId) => Layer | null;
type ClipTraits = Pick<LayerTraits, "clip" | "clipLayer">;
type ContentTraits = Pick<LayerTraits, "geometry" | "content">;

export const CLIP_CHOICES = { none: "None", shape: "Own shape", layer: "Layer" } as const;

export const CLIP_OPTIONS: readonly string[] = Object.values(CLIP_CHOICES);

const SHAPELESS_OPTIONS: readonly string[] = [CLIP_CHOICES.none, CLIP_CHOICES.layer];

export function clipsContent(layer: ContentTraits): boolean {
	return (
		holdsChildren(layer.geometry) ||
		layer.geometry.kind === "text" ||
		layer.content.kind === "component"
	);
}

export function clipOptionsOf(layer: ContentTraits): readonly string[] {
	return clipsContent(layer) ? CLIP_OPTIONS : SHAPELESS_OPTIONS;
}

export function clipChoiceOf(traits: ClipTraits & ContentTraits): string {
	if (traits.clipLayer !== null) {
		return CLIP_CHOICES.layer;
	}
	return traits.clip && clipsContent(traits) ? CLIP_CHOICES.shape : CLIP_CHOICES.none;
}

export function chosenClip(traits: ClipTraits, value: Literal): ClipTraits | null {
	if (typeof value === "boolean") {
		return { clip: value, clipLayer: null };
	}
	switch (value) {
		case CLIP_CHOICES.none: {
			return { clip: false, clipLayer: null };
		}
		case CLIP_CHOICES.shape: {
			return { clip: true, clipLayer: null };
		}
		case CLIP_CHOICES.layer: {
			return { clip: false, clipLayer: traits.clipLayer };
		}
		default: {
			return null;
		}
	}
}

function namedSource(read: ReadLayer, target: Layer): Layer | null {
	const source = target.clipLayer;
	if (source === null) {
		return null;
	}
	const copies = copiesOf(target.id);
	const inCopy =
		copies.length > 0 && copiesOf(source).length === 0
			? read(layerPath(copies, nodeOf(source)))
			: null;
	return inCopy ?? read(source);
}

function holds(read: ReadLayer, layer: Layer, id: LayerId): boolean {
	const seen = new Set<LayerId>();
	for (let parent = layer.parent; parent !== null && !seen.has(parent);) {
		if (parent === id) {
			return true;
		}
		seen.add(parent);
		parent = read(parent)?.parent ?? null;
	}
	return false;
}

export function clipReaches(read: ReadLayer, from: Layer, id: LayerId): boolean {
	const seen = new Set<LayerId>();
	for (let held: Layer | null = from; held !== null && !seen.has(held.id);) {
		if (held.id === id) {
			return true;
		}
		seen.add(held.id);
		held = namedSource(read, held);
	}
	return false;
}

export function clipSourceOf(read: ReadLayer, target: Layer): Layer | null {
	const source = namedSource(read, target);
	if (source === null || holds(read, target, source.id) || clipReaches(read, source, target.id)) {
		return null;
	}
	return source;
}

export function clipTargetsIn(doc: DesignDocument): ReadonlyMap<TreeID, readonly LayerId[]> {
	const read: ReadLayer = (id) => doc.layer(id);
	const targets = new Map<TreeID, LayerId[]>();
	for (const node of doc.tree.tree().getNodes()) {
		const layer = node.isDeleted() ? null : read(node.id);
		const source = layer === null ? null : clipSourceOf(read, layer);
		if (source !== null) {
			const key = nodeOf(source.id);
			targets.set(key, [...(targets.get(key) ?? []), node.id]);
		}
	}
	return targets;
}

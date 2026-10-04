import type { TreeID } from "loro-crdt";
import type { DesignDocument } from "./document";
import type { Layer, LayerId } from "./layer";
import { copiesOf, layerPath, nodeOf } from "./path";

type ReadLayer = (id: LayerId) => Layer | null;

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

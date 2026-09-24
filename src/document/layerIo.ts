import type { LoroTreeNode, TreeID } from "loro-crdt";
import type { Layer, LayerPatch, LayerTraits } from "./layer";
import { readLayerData, writePatch } from "./layerData";
import type { LayerTree } from "./layerTree";
import type { Basis } from "./length";
import type { LayerId } from "./path";
import { resolveTraits } from "./resolveLayer";

export function readLayer(tree: LayerTree, id: LayerId, basis: Basis): LayerTraits | null {
	const node = tree.live(id);
	if (node === null || !tree.liveCopies(id)) {
		return null;
	}
	const traits = readLayerData(tree.sourceOf(node), basis);
	const chain = tree.chainOf(id);
	const context = {
		source: tree.resolver(),
		chain,
		copy: chain[0] === node.id,
		variablesOf: (component: string) => tree.variablesOf(component),
	};
	return resolveTraits(traits, context);
}

export function writeLayer(
	tree: LayerTree,
	node: LoroTreeNode,
	patch: LayerPatch,
	basis: Basis,
): readonly TreeID[] {
	return tree.targets(node, patch).map(([data, part, target]) => {
		writePatch(data, part, basis);
		return target;
	});
}

const CORNER_KEYS = ["cornerRadius", "cornerSmoothing"] as const;

export function unbindCorners(layer: Layer | null, patch: LayerPatch): LayerPatch {
	const { geometry } = patch;
	const before = layer?.geometry;
	if (layer === null || geometry?.kind !== "rectangle" || before?.kind !== "rectangle") {
		return patch;
	}
	const changed = CORNER_KEYS.filter(
		(key) =>
			layer.bindings[key] !== undefined &&
			patch.bindings?.[key] === undefined &&
			geometry[key] !== before[key],
	);
	return changed.length === 0
		? patch
		: {
				...patch,
				bindings: { ...Object.fromEntries(changed.map((key) => [key, null])), ...patch.bindings },
			};
}

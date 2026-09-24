import type { LoroTreeNode, TreeID } from "loro-crdt";
import type { LayerPatch, LayerTraits } from "./layer";
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

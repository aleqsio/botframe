import { isGroup } from "../../document/layer";
import type { LayerId } from "../../document/layer";
import { insideSubtree } from "./dropTarget";
import { layerChain } from "./layerSpace";
import type { ReadLayer } from "./layerSpace";

function entered(read: ReadLayer, group: LayerId, selection: readonly LayerId[]): boolean {
	return selection.some((id) => id !== group && insideSubtree(read, id, group));
}

export function pickedId(read: ReadLayer, selection: readonly LayerId[], hit: LayerId): LayerId {
	const outer = layerChain(read, hit).find(
		(layer) => isGroup(layer) && !entered(read, layer.id, selection),
	);
	return outer?.id ?? hit;
}

export function deeperId(
	read: ReadLayer,
	selection: readonly LayerId[],
	hit: LayerId,
): LayerId | null {
	const chain = layerChain(read, hit);
	const held = chain.findLastIndex((layer) => selection.includes(layer.id));
	return held === -1 ? null : (chain[held + 1]?.id ?? null);
}

export function heldAncestorOf(
	read: ReadLayer,
	selection: readonly LayerId[],
	hit: LayerId,
): LayerId | null {
	return layerChain(read, hit).find((layer) => selection.includes(layer.id))?.id ?? null;
}

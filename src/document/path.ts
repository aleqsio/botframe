import type { TreeID } from "loro-crdt";

export type LayerId = TreeID | `${TreeID}~${string}`;

const NODE = /^\d+@\d+$/u;
const SEPARATOR = "~";

export function isNodeId(text: string): text is TreeID {
	return NODE.test(text);
}

export function isLayerId(text: string): text is LayerId {
	return text.split(SEPARATOR).every((part) => isNodeId(part));
}

export function segmentsOf(id: LayerId): readonly TreeID[] {
	return id.split(SEPARATOR).filter((part) => isNodeId(part));
}

const NO_NODE: TreeID = "0@0";

export function nodeOf(id: LayerId): TreeID {
	return segmentsOf(id).at(-1) ?? NO_NODE;
}

export function copiesOf(id: LayerId): readonly TreeID[] {
	return segmentsOf(id).slice(0, -1);
}

export function layerPath(copies: readonly TreeID[], node: TreeID): LayerId {
	const text = [...copies, node].join(SEPARATOR);
	return isLayerId(text) ? text : node;
}

import type { LoroTreeNode } from "loro-crdt";
import type { LayerId } from "./layer";

export interface MoveRules {
	live: (id: LayerId) => LoroTreeNode | null;
	siblings: (parent: LayerId | null) => readonly LayerId[];
}

function insideSubtree(rules: MoveRules, id: LayerId, parent: LayerId): boolean {
	let node = rules.live(parent);
	while (node !== null) {
		if (node.id === id) {
			return true;
		}
		node = node.parent() ?? null;
	}
	return false;
}

function fitsIndex(rules: MoveRules, id: LayerId, parent: LayerId | null, index: number): boolean {
	const siblings = rules.siblings(parent);
	const room = siblings.length - (siblings.includes(id) ? 1 : 0);
	return Number.isInteger(index) && index >= 0 && index <= room;
}

export function canMove(
	rules: MoveRules,
	id: LayerId,
	parent: LayerId | null,
	index: number | undefined,
): boolean {
	if (rules.live(id) === null) {
		return false;
	}
	if (parent !== null && (rules.live(parent) === null || insideSubtree(rules, id, parent))) {
		return false;
	}
	return index === undefined || fitsIndex(rules, id, parent, index);
}

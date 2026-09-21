import type { LayerId } from "../../document/layer";
import type { Slot } from "../state/slot";
import { NOTHING_SELECTED } from "../state/userState";
import { insideSubtree } from "./dropTarget";
import type { ReadLayer } from "./layerSpace";

function apart(read: ReadLayer, id: LayerId, other: LayerId): boolean {
	return !insideSubtree(read, id, other) && !insideSubtree(read, other, id);
}

export function toggleSelected(
	read: ReadLayer,
	selection: Slot<readonly LayerId[]>,
	id: LayerId,
): void {
	const held = selection.get();
	if (held.includes(id)) {
		const rest = held.filter((selected) => selected !== id);
		selection.set(rest.length === 0 ? NOTHING_SELECTED : rest);
		return;
	}
	selection.set([...held.filter((selected) => apart(read, id, selected)), id]);
}

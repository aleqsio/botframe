import type { LayerId } from "../../document/layer";
import type { Slot } from "../state/slot";
import { NOTHING_SELECTED } from "../state/userState";
import { insideSubtree } from "./dropTarget";
import type { ReadLayer } from "./layerSpace";

function apart(read: ReadLayer, id: LayerId, other: LayerId): boolean {
	return !insideSubtree(read, id, other) && !insideSubtree(read, other, id);
}

export function outermost(read: ReadLayer, ids: readonly LayerId[]): readonly LayerId[] {
	return ids.filter((id) => !ids.some((other) => other !== id && insideSubtree(read, id, other)));
}

export function sameIds(one: readonly LayerId[], other: readonly LayerId[]): boolean {
	return one.length === other.length && one.every((id, index) => id === other[index]);
}

export function selectIds(selection: Slot<readonly LayerId[]>, ids: readonly LayerId[]): void {
	if (sameIds(ids, selection.get())) {
		return;
	}
	selection.set(ids.length === 0 ? NOTHING_SELECTED : ids);
}

export function toggleSelected(
	read: ReadLayer,
	selection: Slot<readonly LayerId[]>,
	id: LayerId,
): void {
	const held = selection.get();
	if (held.includes(id)) {
		selectIds(
			selection,
			held.filter((selected) => selected !== id),
		);
		return;
	}
	selectIds(selection, [...held.filter((selected) => apart(read, id, selected)), id]);
}

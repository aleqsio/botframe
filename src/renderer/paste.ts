import type { LayerId, LayerPatch } from "../document/layer";
import { isArtboard } from "./components/layerEntry";
import type { ReadLayer } from "./input/layerSpace";

export const PASTE_OFFSET = 20;

export function pasteParent(
	read: ReadLayer,
	selection: readonly LayerId[],
	sourceIds: readonly string[],
): LayerId | null {
	const [active] = selection;
	const layer = active === undefined ? null : read(active);
	if (layer === null) {
		return null;
	}
	return isArtboard(layer) && !sourceIds.includes(layer.id) ? layer.id : layer.parent;
}

export interface LayerShift {
	layer: ReadLayer;
	update: (id: LayerId, patch: LayerPatch) => void;
}

export function shiftLayer(shift: LayerShift, id: LayerId, by: number): void {
	const layer = shift.layer(id);
	if (layer === null || by === 0) {
		return;
	}
	shift.update(id, { x: layer.x + by, y: layer.y + by });
}

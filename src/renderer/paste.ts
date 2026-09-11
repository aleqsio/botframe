import type { LayerId, LayerPatch } from "../document/layer";
import { isArtboard } from "./components/layerEntry";
import type { ReadLayer } from "./input/layerSpace";

export const PASTE_OFFSET = 20;

export function pasteParent(
	read: ReadLayer,
	under: readonly LayerId[],
	selection: readonly LayerId[],
): LayerId | null {
	const artboard = under.find((id) => isArtboard(read(id)));
	if (artboard !== undefined) {
		return artboard;
	}
	const [selected] = selection;
	return selected === undefined ? null : (read(selected)?.parent ?? null);
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

import type { Layer, LayerId } from "../../document/layer";
import type { Size } from "../../document/length";
import { isArtboard } from "../components/layerEntry";
import {
	chainTurn,
	fromParentPoint,
	normalizeDegrees,
	placedAround,
	toParentPoint,
	visualCenterOf,
} from "./layerSpace";
import type { ReadLayer } from "./layerSpace";

export function insideSubtree(read: ReadLayer, id: LayerId, root: LayerId): boolean {
	let next: LayerId | null = id;
	while (next !== null) {
		if (next === root) {
			return true;
		}
		next = read(next)?.parent ?? null;
	}
	return false;
}

export function dropParentOf(
	ids: readonly LayerId[],
	read: ReadLayer,
	dragged: LayerId,
): LayerId | null {
	for (const id of ids) {
		if (!insideSubtree(read, id, dragged) && isArtboard(read(id))) {
			return id;
		}
	}
	return null;
}

export type Placement = Pick<Layer, "x" | "y" | "rotation">;

export function heldPlacement(
	layer: Layer,
	from: readonly Layer[],
	to: readonly Layer[],
	size: Size,
): Placement {
	const center = toParentPoint(to, fromParentPoint(from, visualCenterOf(layer)));
	const rotation = normalizeDegrees(layer.rotation + chainTurn(from) - chainTurn(to));
	return { ...placedAround({ ...size, rotation, origin: layer.origin }, center), rotation };
}

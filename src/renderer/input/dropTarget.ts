import type { Layer, LayerId } from "../../document/layer";
import type { Size } from "../../document/length";
import { isFrame } from "../components/layerEntry";
import {
	poseInside,
	seenLinear,
	fromParentPoint,
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
		if (!insideSubtree(read, id, dragged) && isFrame(read(id))) {
			return id;
		}
	}
	return null;
}

export type Placement = Pick<Layer, "x" | "y" | "rotation" | "skewX" | "skewY" | "mirrored">;

export function heldPlacement(
	layer: Layer,
	from: readonly Layer[],
	to: readonly Layer[],
	size: Size,
): Placement {
	const center = toParentPoint(to, fromParentPoint(from, visualCenterOf(layer)));
	const pose = poseInside(to, seenLinear(from, layer), layer);
	return { ...placedAround({ ...size, ...pose, origin: layer.origin }, center), ...pose };
}

import type { Layer, LayerId } from "../../document/layer";
import { isArtboard } from "../components/layerEntry";
import {
	centerOf,
	fromParentPoint,
	halfSizeOf,
	normalizeDegrees,
	toParentPoint,
} from "./layerSpace";
import type { ReadLayer } from "./layerSpace";

type TakesChild = (layer: Layer | null) => boolean;

function isRectangle(layer: Layer | null): boolean {
	return layer?.geometry.kind === "rectangle";
}

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
	alt: boolean,
): LayerId | null {
	const takesChild: TakesChild = alt ? isRectangle : isArtboard;
	for (const id of ids) {
		if (!insideSubtree(read, id, dragged) && takesChild(read(id))) {
			return id;
		}
	}
	return null;
}

export type Placement = Pick<Layer, "x" | "y" | "rotation">;

function chainRotation(chain: readonly Layer[]): number {
	return chain.reduce((total, layer) => total + layer.rotation, 0);
}

export function heldPlacement(
	layer: Layer,
	from: readonly Layer[],
	to: readonly Layer[],
): Placement {
	const center = toParentPoint(to, fromParentPoint(from, centerOf(layer)));
	const half = halfSizeOf(layer);
	return {
		x: center.x - half.x,
		y: center.y - half.y,
		rotation: normalizeDegrees(layer.rotation + chainRotation(from) - chainRotation(to)),
	};
}

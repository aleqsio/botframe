import type { Layer, LayerId } from "../../document/layer";
import { isArtboard } from "../components/layerEntry";
import type { Point } from "../state/camera";
import { rotatePoint } from "./layerSpace";
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

function chainRotation(chain: readonly Layer[]): number {
	return chain.reduce((total, layer) => total + layer.rotation, 0);
}

export function heldOffset(from: readonly Layer[], to: readonly Layer[], offset: Point): Point {
	return rotatePoint(offset, chainRotation(from) - chainRotation(to));
}

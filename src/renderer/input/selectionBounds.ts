import type { Layer, LayerId, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { cornersOf, fromParentPoint, hullOf, outOfLayer, parentChain } from "./layerSpace";
import type { ReadLayer } from "./layerSpace";

export function rectCorners(rect: Rect): readonly Point[] {
	return cornersOf(rect).map((corner) => ({ x: rect.x + corner.x, y: rect.y + corner.y }));
}

export function canvasCornersOf(read: ReadLayer, layer: Layer): readonly Point[] {
	const chain = parentChain(read, layer.id);
	return cornersOf(layer).map((corner) => fromParentPoint(chain, outOfLayer(layer, corner)));
}

export function boundsOf(read: ReadLayer, ids: readonly LayerId[]): Rect | null {
	const [first, ...rest] = ids.flatMap((id) => {
		const layer = read(id);
		return layer === null ? [] : canvasCornersOf(read, layer);
	});
	return first === undefined ? null : hullOf([first, ...rest]);
}

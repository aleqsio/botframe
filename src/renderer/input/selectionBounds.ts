import type { Layer, LayerId, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { cornersOf, fromParentPoint, hullOf, outOfLayer, parentChain } from "./layerSpace";
import type { Corners, ReadLayer } from "./layerSpace";

export function rectCorners(rect: Rect): Corners {
	const [a, b, c, d] = cornersOf(rect);
	const at = (corner: Point): Point => ({ x: rect.x + corner.x, y: rect.y + corner.y });
	return [at(a), at(b), at(c), at(d)];
}

export function canvasCornersOf(read: ReadLayer, layer: Layer): Corners {
	const chain = parentChain(read, layer.id);
	const [a, b, c, d] = cornersOf(layer);
	const at = (corner: Point): Point => fromParentPoint(chain, outOfLayer(layer, corner));
	return [at(a), at(b), at(c), at(d)];
}

export function canvasHullOf(read: ReadLayer, layer: Layer): Rect {
	return hullOf(canvasCornersOf(read, layer));
}

export function hullOfRects(rects: readonly Rect[]): Rect | null {
	const [first, ...rest] = rects.flatMap((rect) => rectCorners(rect));
	return first === undefined ? null : hullOf([first, ...rest]);
}

export function boundsOf(read: ReadLayer, ids: readonly LayerId[]): Rect | null {
	const [first, ...rest] = ids.flatMap((id) => {
		const layer = read(id);
		return layer === null ? [] : canvasCornersOf(read, layer);
	});
	return first === undefined ? null : hullOf([first, ...rest]);
}

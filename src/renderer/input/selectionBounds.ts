import type { Layer, LayerId, Rect } from "../../document/layer";
import type { Side } from "../../document/layout";
import type { Point } from "../state/camera";
import { cornersOf, fromParentPoint, hullOf, outOfLayer, parentChain } from "./layerSpace";
import type { Corners, ReadLayer } from "./layerSpace";

type Inset = Readonly<Record<Side, number>>;

function contentBoxOf(layer: Layer, inset: Inset): Rect {
	const width = Math.max(0, layer.width - inset.left - inset.right);
	const height = Math.max(0, layer.height - inset.top - inset.bottom);
	return {
		x: Math.min(inset.left, layer.width),
		y: Math.min(inset.top, layer.height),
		width,
		height,
	};
}

export function rectCorners(rect: Rect): Corners {
	const [a, b, c, d] = cornersOf(rect);
	const at = (corner: Point): Point => ({ x: rect.x + corner.x, y: rect.y + corner.y });
	return [at(a), at(b), at(c), at(d)];
}

function canvasCornersIn(read: ReadLayer, layer: Layer, local: Rect): Corners {
	const chain = parentChain(read, layer.id);
	const [a, b, c, d] = rectCorners(local);
	const at = (corner: Point): Point => fromParentPoint(chain, outOfLayer(layer, corner));
	return [at(a), at(b), at(c), at(d)];
}

export function canvasCornersOf(read: ReadLayer, layer: Layer): Corners {
	return canvasCornersIn(read, layer, { x: 0, y: 0, width: layer.width, height: layer.height });
}

export function canvasHullOf(read: ReadLayer, layer: Layer): Rect {
	return hullOf(canvasCornersOf(read, layer));
}

export function canvasContentHullOf(read: ReadLayer, layer: Layer, inset: Inset): Rect {
	return hullOf(canvasCornersIn(read, layer, contentBoxOf(layer, inset)));
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

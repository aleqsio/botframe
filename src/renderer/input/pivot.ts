import type { Layer, LayerId, Origin, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import type { GroupPivot } from "../state/userState";
import { HANDLE_SIZE } from "./handles";
import {
	centerOf,
	fromParentPoint,
	intoLayer,
	pivotOf,
	placedAround,
	visualCenterOf,
} from "./layerSpace";
import type { Placed, ReadLayer } from "./layerSpace";
import { sameIds } from "./selection";
import { boundsOf } from "./selectionBounds";

const ORIGIN_LIMIT = 100;
const MIDDLE = 0.5;

export const ORIGIN_MESSAGE = "set origin";

export function layerPivot(chain: readonly Layer[], layer: Placed): Point {
	const pivot = pivotOf(layer);
	return fromParentPoint(chain, { x: layer.x + pivot.x, y: layer.y + pivot.y });
}

export function groupPivotOf(held: GroupPivot | null, ids: readonly LayerId[], box: Rect): Point {
	if (held === null || !sameIds(held.ids, ids)) {
		return centerOf(box);
	}
	return { x: box.x + held.at.x * box.width, y: box.y + held.at.y * box.height };
}

function fractionOf(offset: number, extent: number): number {
	const fraction = extent === 0 ? MIDDLE : offset / extent;
	return Math.min(Math.max(fraction, -ORIGIN_LIMIT), ORIGIN_LIMIT);
}

export function pinnedPivot(
	read: ReadLayer,
	ids: readonly LayerId[],
	point: Point,
): GroupPivot | null {
	const box = boundsOf(read, ids);
	return box === null
		? null
		: {
				ids,
				at: {
					x: fractionOf(point.x - box.x, box.width),
					y: fractionOf(point.y - box.y, box.height),
				},
			};
}

export function nearPivot(pivot: Point, point: Point, zoom: number): boolean {
	return Math.hypot(point.x - pivot.x, point.y - pivot.y) <= HANDLE_SIZE / 2 / zoom;
}

export interface MovedOrigin {
	origin: Origin;
	place: Point;
}

export function movedOrigin(layer: Placed, point: Point): MovedOrigin {
	const local = intoLayer(layer, point);
	const origin = { x: fractionOf(local.x, layer.width), y: fractionOf(local.y, layer.height) };
	return { origin, place: placedAround({ ...layer, origin }, visualCenterOf(layer)) };
}

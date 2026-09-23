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
import type { Placed } from "./layerSpace";

export const ORIGIN_MESSAGE = "set origin";

export function layerPivot(chain: readonly Layer[], layer: Placed): Point {
	const pivot = pivotOf(layer);
	return fromParentPoint(chain, { x: layer.x + pivot.x, y: layer.y + pivot.y });
}

function sameIds(one: readonly LayerId[], other: readonly LayerId[]): boolean {
	return one.length === other.length && one.every((id, index) => other[index] === id);
}

export function groupPivotOf(held: GroupPivot | null, ids: readonly LayerId[], box: Rect): Point {
	return held !== null && sameIds(held.ids, ids) ? held.point : centerOf(box);
}

export function nearPivot(pivot: Point, point: Point, zoom: number): boolean {
	return Math.hypot(point.x - pivot.x, point.y - pivot.y) <= HANDLE_SIZE / zoom;
}

export interface MovedOrigin {
	origin: Origin;
	place: Point;
}

export function movedOrigin(layer: Placed, point: Point): MovedOrigin {
	const local = intoLayer(layer, point);
	const origin = { x: local.x / layer.width, y: local.y / layer.height };
	return { origin, place: placedAround({ ...layer, origin }, visualCenterOf(layer)) };
}

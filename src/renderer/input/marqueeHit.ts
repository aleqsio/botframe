import type { LayerId, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import type { ReadLayer } from "./layerSpace";
import { canvasCornersOf, rectCorners } from "./selectionBounds";

interface Span {
	low: number;
	high: number;
}

function edgeNormals(polygon: readonly Point[]): readonly Point[] {
	return polygon.map((point, index) => {
		const next = polygon[(index + 1) % polygon.length] ?? point;
		return { x: point.y - next.y, y: next.x - point.x };
	});
}

function spanOn(polygon: readonly Point[], axis: Point): Span {
	const alongs = polygon.map((point) => point.x * axis.x + point.y * axis.y);
	return { low: Math.min(...alongs), high: Math.max(...alongs) };
}

function apartOn(one: readonly Point[], other: readonly Point[], axis: Point): boolean {
	const first = spanOn(one, axis);
	const second = spanOn(other, axis);
	return first.high < second.low || second.high < first.low;
}

export function quadsTouch(one: readonly Point[], other: readonly Point[]): boolean {
	const axes = [...edgeNormals(one), ...edgeNormals(other)];
	return !axes.some((axis) => apartOn(one, other, axis));
}

export function touchedIds(
	read: ReadLayer,
	ids: readonly LayerId[],
	marquee: Rect,
): readonly LayerId[] {
	const box = rectCorners(marquee);
	return ids.filter((id) => {
		const layer = read(id);
		return layer !== null && quadsTouch(box, canvasCornersOf(read, layer));
	});
}

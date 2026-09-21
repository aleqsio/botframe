import type { Layer, LayerId, Rect } from "../../document/layer";
import type { Size } from "../../document/length";
import type { Point } from "../state/camera";

const HALF_TURN = 180;

export type ReadLayer = (id: LayerId) => Layer | null;

export interface Placed extends Rect {
	rotation: number;
}

export function centerOf(layer: Placed): Point {
	return { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
}

export function halfSizeOf(size: Size): Point {
	return { x: size.width / 2, y: size.height / 2 };
}

export function rotatePoint(point: Point, degrees: number): Point {
	const radians = (degrees * Math.PI) / HALF_TURN;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

export function toLayerPoint(layer: Placed, point: Point): Point {
	const center = centerOf(layer);
	return rotatePoint({ x: point.x - center.x, y: point.y - center.y }, -layer.rotation);
}

export function containsPoint(layer: Placed, point: Point): boolean {
	const local = toLayerPoint(layer, point);
	const half = halfSizeOf(layer);
	return Math.abs(local.x) <= half.x && Math.abs(local.y) <= half.y;
}

export function angleFrom(center: Point, point: Point): number {
	return (Math.atan2(point.y - center.y, point.x - center.x) * HALF_TURN) / Math.PI;
}

export function normalizeDegrees(degrees: number): number {
	const full = HALF_TURN * 2;
	return ((degrees % full) + full) % full;
}

export function chainRotation(chain: readonly Layer[]): number {
	return chain.reduce((total, layer) => total + layer.rotation, 0);
}

export function layerChain(read: ReadLayer, id: LayerId | null): Layer[] {
	const chain: Layer[] = [];
	let next = id;
	while (next !== null) {
		const layer = read(next);
		if (layer === null) {
			break;
		}
		chain.push(layer);
		next = layer.parent;
	}
	return chain.toReversed();
}

export function parentChain(read: ReadLayer, id: LayerId): Layer[] {
	return layerChain(read, read(id)?.parent ?? null);
}

function intoLayer(layer: Layer, point: Point): Point {
	const local = toLayerPoint(layer, point);
	const half = halfSizeOf(layer);
	return { x: local.x + half.x, y: local.y + half.y };
}

export function toParentPoint(chain: readonly Layer[], point: Point): Point {
	return chain.reduce<Point>((carried, layer) => intoLayer(layer, carried), point);
}

function outOfLayer(layer: Layer, point: Point): Point {
	const half = halfSizeOf(layer);
	const turned = rotatePoint({ x: point.x - half.x, y: point.y - half.y }, layer.rotation);
	const center = centerOf(layer);
	return { x: turned.x + center.x, y: turned.y + center.y };
}

export function fromParentPoint(chain: readonly Layer[], point: Point): Point {
	return chain.reduceRight<Point>((carried, layer) => outOfLayer(layer, carried), point);
}

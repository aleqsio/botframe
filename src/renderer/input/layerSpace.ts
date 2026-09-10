import type { Layer } from "../../document/layer";
import type { Point } from "../state/camera";

const HALF_TURN = 180;

export function centerOf(layer: Layer): Point {
	return { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
}

export function halfSizeOf(layer: Layer): Point {
	return { x: layer.width / 2, y: layer.height / 2 };
}

export function rotatePoint(point: Point, degrees: number): Point {
	const radians = (degrees * Math.PI) / HALF_TURN;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

export function toLayerPoint(layer: Layer, point: Point): Point {
	const center = centerOf(layer);
	return rotatePoint({ x: point.x - center.x, y: point.y - center.y }, -layer.rotation);
}

export function angleFrom(center: Point, point: Point): number {
	return (Math.atan2(point.y - center.y, point.x - center.x) * HALF_TURN) / Math.PI;
}

export function normalizeDegrees(degrees: number): number {
	const full = HALF_TURN * 2;
	return ((degrees % full) + full) % full;
}

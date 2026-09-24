import { CENTER_ORIGIN } from "../../document/layer";
import type { Layer, LayerId, Origin, Pose, Rect } from "../../document/layer";
import type { Size } from "../../document/length";
import type { Point } from "../state/camera";
import {
	HALF_TURN,
	NO_POSE,
	applyLinear,
	invertLinear,
	linearOf,
	multiplyLinear,
	poseOf,
	radiansOf,
} from "./linear";
import type { Linear } from "./linear";

export type ReadLayer = (id: LayerId) => Layer | null;

export interface Turned extends Size, Pose {
	origin: Origin;
}

export type Placed = Turned & Rect;

export function centerOf(layer: Rect): Point {
	return { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
}

export function halfSizeOf(size: Size): Point {
	return { x: size.width / 2, y: size.height / 2 };
}

export function pivotOf(layer: Turned): Point {
	return { x: layer.origin.x * layer.width, y: layer.origin.y * layer.height };
}

export function rotatePoint(point: Point, degrees: number): Point {
	const radians = radiansOf(degrees);
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

export function posePoint(point: Point, pose: Pose): Point {
	return applyLinear(linearOf(pose), point);
}

function unposePoint(point: Point, pose: Pose): Point {
	return applyLinear(invertLinear(linearOf(pose)), point);
}

export function normalizedPose(pose: Pose): Pose {
	return { ...pose, rotation: normalizeDegrees(pose.rotation) };
}

export function intoLayer(layer: Placed, point: Point): Point {
	const pivot = pivotOf(layer);
	const turned = unposePoint(
		{ x: point.x - layer.x - pivot.x, y: point.y - layer.y - pivot.y },
		layer,
	);
	return { x: turned.x + pivot.x, y: turned.y + pivot.y };
}

export function outOfLayer(layer: Placed, local: Point): Point {
	const pivot = pivotOf(layer);
	const turned = posePoint({ x: local.x - pivot.x, y: local.y - pivot.y }, layer);
	return { x: layer.x + pivot.x + turned.x, y: layer.y + pivot.y + turned.y };
}

export type Corners = readonly [Point, Point, Point, Point];

export function cornersOf(box: Size): Corners {
	return [
		{ x: 0, y: 0 },
		{ x: box.width, y: 0 },
		{ x: box.width, y: box.height },
		{ x: 0, y: box.height },
	];
}

export function hullOf(points: readonly [Point, ...Point[]]): Rect {
	let [low] = points;
	let high = low;
	for (const point of points) {
		low = { x: Math.min(low.x, point.x), y: Math.min(low.y, point.y) };
		high = { x: Math.max(high.x, point.x), y: Math.max(high.y, point.y) };
	}
	return { x: low.x, y: low.y, width: high.x - low.x, height: high.y - low.y };
}

export function turnedBounds(layer: Turned): Rect {
	const flat = { ...layer, x: 0, y: 0 };
	const [first, ...rest] = cornersOf(layer);
	return hullOf([outOfLayer(flat, first), ...rest.map((corner) => outOfLayer(flat, corner))]);
}

export function toLayerPoint(layer: Placed, point: Point): Point {
	const local = intoLayer(layer, point);
	const half = halfSizeOf(layer);
	return { x: local.x - half.x, y: local.y - half.y };
}

export function containsPoint(layer: Placed, point: Point): boolean {
	const local = toLayerPoint(layer, point);
	const half = halfSizeOf(layer);
	return Math.abs(local.x) <= half.x && Math.abs(local.y) <= half.y;
}

export function anchorOf(layer: Placed, point: Point): Point {
	const local = intoLayer(layer, point);
	return {
		x: layer.width === 0 ? 0 : local.x / layer.width,
		y: layer.height === 0 ? 0 : local.y / layer.height,
	};
}

export function anchoredPlace(layer: Turned, anchor: Point, point: Point): Point {
	const pivot = pivotOf(layer);
	const turned = posePoint(
		{ x: anchor.x * layer.width - pivot.x, y: anchor.y * layer.height - pivot.y },
		layer,
	);
	return { x: point.x - pivot.x - turned.x, y: point.y - pivot.y - turned.y };
}

export function visualCenterOf(layer: Placed): Point {
	return outOfLayer(layer, halfSizeOf(layer));
}

export function placedAround(layer: Turned, center: Point): Point {
	return anchoredPlace(layer, CENTER_ORIGIN, center);
}

export function angleFrom(center: Point, point: Point): number {
	return (Math.atan2(point.y - center.y, point.x - center.x) * HALF_TURN) / Math.PI;
}

export function normalizeDegrees(degrees: number): number {
	const full = HALF_TURN * 2;
	return ((degrees % full) + full) % full;
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

export function chainLinear(chain: readonly Pose[]): Linear {
	return chain.reduce<Linear>(
		(total, layer) => multiplyLinear(total, linearOf(layer)),
		linearOf(NO_POSE),
	);
}

export function chainPose(chain: readonly Pose[]): Pose {
	return poseOf(chainLinear(chain));
}

export function uprightLinear(chain: readonly Pose[]): Linear {
	const seen = chainLinear(chain);
	const turns = chain.reduce((total, layer) => total + layer.rotation, 0);
	const turn = linearOf({
		...NO_POSE,
		rotation: poseOf(seen, { ...NO_POSE, rotation: turns }).rotation,
	});
	return multiplyLinear(invertLinear(seen), turn);
}

export function seenLinear(parents: readonly Pose[], layer: Pose): Linear {
	return multiplyLinear(chainLinear(parents), linearOf(layer));
}

export function poseInside(parents: readonly Pose[], seen: Linear, near: Pose): Pose {
	const inside = multiplyLinear(invertLinear(chainLinear(parents)), seen);
	return normalizedPose(poseOf(inside, near));
}

export function turnedOnScreen(
	parents: readonly Pose[],
	rotation: number,
	degrees: number,
): number {
	return normalizeDegrees(rotation + (chainPose(parents).mirrored ? -degrees : degrees));
}

export function toParentPoint(chain: readonly Layer[], point: Point): Point {
	return chain.reduce<Point>((carried, layer) => intoLayer(layer, carried), point);
}

export function fromParentPoint(chain: readonly Layer[], point: Point): Point {
	return chain.reduceRight<Point>((carried, layer) => outOfLayer(layer, carried), point);
}

import { CENTER_ORIGIN } from "../../document/layer";
import type { Layer, LayerId, Pose, Rect } from "../../document/layer";
import type { Size } from "../../document/length";
import type { Point } from "../state/camera";
import {
	HALF_TURN,
	NO_POSE,
	invertLinear,
	linearOf,
	multiplyLinear,
	poseOf,
	radiansOf,
} from "../../document/linear";
import type { Linear } from "../../document/linear";

import { anchoredPlace, intoLayer, outOfLayer } from "../../document/space";
import type { Placed, Turned } from "../../document/space";

export {
	anchoredPlace,
	cornersOf,
	hullOf,
	intoLayer,
	outOfLayer,
	pivotOf,
	posePoint,
	turnedBounds,
} from "../../document/space";
export type { Corners, Placed, Turned } from "../../document/space";

export type ReadLayer = (id: LayerId) => Layer | null;

export function centerOf(layer: Rect): Point {
	return { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
}

export function halfSizeOf(size: Size): Point {
	return { x: size.width / 2, y: size.height / 2 };
}

export function rotatePoint(point: Point, degrees: number): Point {
	const radians = radiansOf(degrees);
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

export function normalizedPose(pose: Pose): Pose {
	return { ...pose, rotation: normalizeDegrees(pose.rotation) };
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

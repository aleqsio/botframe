import type { Layer, LayerId, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { applyAffine, applyLinear } from "./affine";
import type { Affine } from "./affine";
import { drawnRead } from "./drawn";
import {
	angleFrom,
	centerOf,
	chainRotation,
	fromParentPoint,
	halfSizeOf,
	normalizeDegrees,
	parentChain,
	rotatePoint,
	toParentPoint,
} from "./layerSpace";
import type { Placed, ReadLayer } from "./layerSpace";
import { MIN_LAYER_SIZE } from "./transform";

const ORIGIN: Point = { x: 0, y: 0 };
const DEGREE_STEPS = 1_000_000;

export interface Posed {
	layer: Layer;
	drawn: Layer;
	chain: readonly Layer[];
}

function cornersOf(placed: Placed): Point[] {
	const center = centerOf(placed);
	const half = halfSizeOf(placed);
	return [
		{ x: -half.x, y: -half.y },
		{ x: half.x, y: -half.y },
		{ x: half.x, y: half.y },
		{ x: -half.x, y: half.y },
	].map((corner) => {
		const turned = rotatePoint(corner, placed.rotation);
		return { x: center.x + turned.x, y: center.y + turned.y };
	});
}

export function posedOf(read: ReadLayer, id: LayerId): Posed | null {
	const layer = read(id);
	const drawn = drawnRead(read);
	const box = drawn(id);
	if (layer === null || box === null) {
		return null;
	}
	return { layer, drawn: box, chain: parentChain(drawn, id) };
}

export function canvasCornersOf(posed: Posed): Point[] {
	return cornersOf(posed.drawn).map((corner) => fromParentPoint(posed.chain, corner));
}

export function boundsOf(points: readonly Point[]): Rect | null {
	const [first] = points;
	if (first === undefined) {
		return null;
	}
	const box = { left: first.x, top: first.y, right: first.x, bottom: first.y };
	for (const point of points) {
		box.left = Math.min(box.left, point.x);
		box.top = Math.min(box.top, point.y);
		box.right = Math.max(box.right, point.x);
		box.bottom = Math.max(box.bottom, point.y);
	}
	return { x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top };
}

export function groupFrameOf(read: ReadLayer, ids: readonly LayerId[]): Rect | null {
	const posed = ids.flatMap((id) => posedOf(read, id) ?? []);
	return boundsOf(posed.flatMap((entry) => canvasCornersOf(entry)));
}

function affineTurn(affine: Affine): number {
	const turned = angleFrom(ORIGIN, applyLinear(affine, { x: 1, y: 0 }));
	return Math.round(turned * DEGREE_STEPS) / DEGREE_STEPS;
}

function stretched(size: number, vector: Point): number {
	return Math.max(size * Math.hypot(vector.x, vector.y), MIN_LAYER_SIZE);
}

export function transformedPlace(posed: Posed, affine: Affine): Placed {
	const { drawn, chain } = posed;
	const turned = chainRotation(chain);
	const canvasTurn = drawn.rotation + turned;
	const center = applyAffine(affine, fromParentPoint(chain, centerOf(drawn)));
	const across = applyLinear(affine, rotatePoint({ x: 1, y: 0 }, canvasTurn));
	const down = applyLinear(affine, rotatePoint({ x: 0, y: 1 }, canvasTurn));
	const width = stretched(drawn.width, across);
	const height = stretched(drawn.height, down);
	const placed = toParentPoint(chain, center);
	return {
		x: placed.x - width / 2,
		y: placed.y - height / 2,
		width,
		height,
		rotation: normalizeDegrees(drawn.rotation + affineTurn(affine)),
	};
}

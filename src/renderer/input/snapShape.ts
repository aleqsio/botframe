import type { Geometry, Layer } from "../../document/layer";
import type { Size } from "../../document/length";
import type { Point } from "../state/camera";
import { HALF_TURN, cornersOf, fromParentPoint } from "./layerSpace";

export type Curve =
	| { kind: "segment"; from: Point; to: Point }
	| { kind: "arc"; center: Point; radii: Point; turn: number; from: number; to: number };

export interface SnapShape {
	points: readonly Point[];
	curves: readonly Curve[];
}

type SnapReporter = (layer: Layer) => SnapShape;

function middleOf(box: Size): Point {
	return { x: box.width / 2, y: box.height / 2 };
}

function edgeMiddlesOf(box: Size): Point[] {
	const middle = middleOf(box);
	return [
		{ x: middle.x, y: 0 },
		{ x: box.width, y: middle.y },
		{ x: middle.x, y: box.height },
		{ x: 0, y: middle.y },
	];
}

function boxPointsOf(box: Size): Point[] {
	return [...cornersOf(box), middleOf(box)];
}

function roundingOf(box: Size, geometry: Geometry): number {
	const wanted = geometry.kind === "rectangle" ? geometry.cornerRadius : 0;
	return Math.max(Math.min(wanted, box.width / 2, box.height / 2), 0);
}

function roundingPointsOf(box: Size, radius: number): Point[] {
	if (radius <= 0) {
		return [];
	}
	const { width, height } = box;
	return [
		{ x: radius, y: 0 },
		{ x: width - radius, y: 0 },
		{ x: width, y: radius },
		{ x: width, y: height - radius },
		{ x: width - radius, y: height },
		{ x: radius, y: height },
		{ x: 0, y: height - radius },
		{ x: 0, y: radius },
	];
}

function edgeSegmentsOf(box: Size, radius: number): Curve[] {
	const { width, height } = box;
	return [
		{ kind: "segment", from: { x: radius, y: 0 }, to: { x: width - radius, y: 0 } },
		{ kind: "segment", from: { x: width, y: radius }, to: { x: width, y: height - radius } },
		{ kind: "segment", from: { x: width - radius, y: height }, to: { x: radius, y: height } },
		{ kind: "segment", from: { x: 0, y: height - radius }, to: { x: 0, y: radius } },
	];
}

function cornerArcsOf(box: Size, radius: number): Curve[] {
	if (radius <= 0) {
		return [];
	}
	const radii = { x: radius, y: radius };
	const far = { x: box.width - radius, y: box.height - radius };
	return [
		{ kind: "arc", center: { x: radius, y: radius }, radii, turn: 0, from: 180, to: 270 },
		{ kind: "arc", center: { x: far.x, y: radius }, radii, turn: 0, from: 270, to: 360 },
		{ kind: "arc", center: far, radii, turn: 0, from: 0, to: 90 },
		{ kind: "arc", center: { x: radius, y: far.y }, radii, turn: 0, from: 90, to: 180 },
	];
}

function rectangleShapeOf(layer: Layer): SnapShape {
	const radius = roundingOf(layer, layer.geometry);
	return {
		points: [...boxPointsOf(layer), ...edgeMiddlesOf(layer), ...roundingPointsOf(layer, radius)],
		curves: [...edgeSegmentsOf(layer, radius), ...cornerArcsOf(layer, radius)],
	};
}

function ellipseShapeOf(layer: Layer): SnapShape {
	const middle = middleOf(layer);
	return {
		points: [middle, ...edgeMiddlesOf(layer)],
		curves: [{ kind: "arc", center: middle, radii: middle, turn: 0, from: 0, to: 360 }],
	};
}

function boxShapeOf(layer: Layer): SnapShape {
	return { points: boxPointsOf(layer), curves: edgeSegmentsOf(layer, 0) };
}

export const SNAP_REPORTERS: Readonly<Record<Geometry["kind"], SnapReporter>> = {
	rectangle: rectangleShapeOf,
	ellipse: ellipseShapeOf,
	path: boxShapeOf,
	unsupported: boxShapeOf,
};

function movedCurve(layer: Layer, curve: Curve): Curve {
	const chain = [layer];
	if (curve.kind === "segment") {
		return {
			kind: "segment",
			from: fromParentPoint(chain, curve.from),
			to: fromParentPoint(chain, curve.to),
		};
	}
	const center = fromParentPoint(chain, curve.center);
	if (layer.mirrored) {
		const sweep = { from: HALF_TURN - curve.to, to: HALF_TURN - curve.from };
		return { ...curve, ...sweep, center, turn: layer.rotation - curve.turn };
	}
	return { ...curve, center, turn: curve.turn + layer.rotation };
}

export function snapShapeOf(layer: Layer): SnapShape {
	const shape = SNAP_REPORTERS[layer.geometry.kind](layer);
	return {
		points: shape.points.map((local) => fromParentPoint([layer], local)),
		curves: shape.curves.map((curve) => movedCurve(layer, curve)),
	};
}

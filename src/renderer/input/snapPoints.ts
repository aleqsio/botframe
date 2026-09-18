import type { Geometry, Layer } from "../../document/layer";
import type { Size } from "../../document/length";
import type { Point } from "../state/camera";
import { fromParentPoint } from "./layerSpace";

type SnapReporter = (layer: Layer) => readonly Point[];

function middleOf(box: Size): Point {
	return { x: box.width / 2, y: box.height / 2 };
}

function cornersOf(box: Size): Point[] {
	return [
		{ x: 0, y: 0 },
		{ x: box.width, y: 0 },
		{ x: box.width, y: box.height },
		{ x: 0, y: box.height },
	];
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

function roundingPointsOf(box: Size, cornerRadius: number): Point[] {
	const radius = Math.min(cornerRadius, box.width / 2, box.height / 2);
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

function cornerRadiusOf(geometry: Geometry): number {
	return geometry.kind === "rectangle" ? geometry.cornerRadius : 0;
}

export const SNAP_REPORTERS: Readonly<Record<Geometry["kind"], SnapReporter>> = {
	rectangle: (layer) => [
		...boxPointsOf(layer),
		...edgeMiddlesOf(layer),
		...roundingPointsOf(layer, cornerRadiusOf(layer.geometry)),
	],
	ellipse: (layer) => [middleOf(layer), ...edgeMiddlesOf(layer)],
	path: boxPointsOf,
	unsupported: boxPointsOf,
};

export function snapPointsOf(layer: Layer): Point[] {
	const chain = [layer];
	return SNAP_REPORTERS[layer.geometry.kind](layer).map((local) => fromParentPoint(chain, local));
}

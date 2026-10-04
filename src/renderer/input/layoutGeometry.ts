import type { GuideAxis } from "../../document/guides";
import type { Layer, LayerPatch, Rect } from "../../document/layer";
import type { Size } from "../../document/length";
import type { Point } from "../state/camera";
import { turnedBounds } from "./layerSpace";

export const SIZE_ALONG: Readonly<Record<GuideAxis, "width" | "height">> = {
	x: "width",
	y: "height",
};

export function alignOffset(box: Rect, reference: Rect, axis: GuideAxis, at: number): number {
	const size = SIZE_ALONG[axis];
	return reference[axis] + at * (reference[size] - box[size]) - box[axis];
}

export function mirroredStart(box: Rect, reference: Rect, axis: GuideAxis): number {
	const size = SIZE_ALONG[axis];
	return 2 * reference[axis] + reference[size] - box[axis] - box[size];
}

export function shiftAlong(axes: readonly GuideAxis[], value: (axis: GuideAxis) => number): Point {
	return {
		x: axes.includes("x") ? value("x") : 0,
		y: axes.includes("y") ? value("y") : 0,
	};
}

export const SMALLEST_SPREAD = 3;

export function spreadOffsets(boxes: readonly Rect[], axis: GuideAxis): readonly number[] {
	const size = SIZE_ALONG[axis];
	const ranked = boxes
		.map((box, index) => ({ box, index }))
		.toSorted((one, other) => one.box[axis] - other.box[axis]);
	const first = ranked.at(0);
	const offsets = boxes.map(() => 0);
	if (first === undefined || ranked.length < SMALLEST_SPREAD) {
		return offsets;
	}
	const far = Math.max(...ranked.map((entry) => entry.box[axis] + entry.box[size]));
	const span = far - first.box[axis];
	const filled = ranked.reduce((total, entry) => total + entry.box[size], 0);
	const gap = (span - filled) / (ranked.length - 1);
	let place = first.box[axis];
	for (const entry of ranked) {
		offsets[entry.index] = place - entry.box[axis];
		place += entry.box[size] + gap;
	}
	return offsets;
}

export function localBoxOf(layer: Layer): Rect {
	const turned = turnedBounds(layer);
	return { ...turned, x: layer.x + turned.x, y: layer.y + turned.y };
}

export function fixedFill(layer: Layer, drawn: Size): LayerPatch {
	const wide = layer.layout.width === "fill";
	const tall = layer.layout.height === "fill";
	return {
		...(wide ? { width: drawn.width } : {}),
		...(tall ? { height: drawn.height } : {}),
		layout: { ...(wide ? { width: "fixed" } : {}), ...(tall ? { height: "fixed" } : {}) },
	};
}

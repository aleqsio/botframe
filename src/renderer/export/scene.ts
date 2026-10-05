import { bagOf } from "../../document/bag";
import type { CaptureRect, ExportScene } from "../../shared/exportImage";

function isNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function areaOf(value: unknown): CaptureRect | null {
	if (value === null) {
		return null;
	}
	const { x, y, width, height } = bagOf(value);
	if (!isNumber(x) || !isNumber(y) || !isNumber(width) || !isNumber(height)) {
		throw new TypeError("The area is not valid.");
	}
	return { x, y, width, height };
}

export function sceneOf(value: unknown): ExportScene {
	const { file, target, area, scale, longSide } = bagOf(value);
	if (!(file instanceof Uint8Array) || !isNumber(scale) || !isNumber(longSide) || scale <= 0) {
		throw new TypeError("The export request is not valid.");
	}
	if (target !== null && typeof target !== "string") {
		throw new TypeError("The export target is not valid.");
	}
	return { file, target, area: areaOf(area), scale, longSide };
}

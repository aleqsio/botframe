import { bagOf } from "../../document/bag";
import { EXPORT_FORMATS } from "../../shared/exportFile";
import type { CaptureRect, ExportFormat, ExportScene } from "../../shared/exportFile";

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

function formatOf(value: unknown): ExportFormat {
	const format = EXPORT_FORMATS.find((held) => held.id === value);
	if (format === undefined) {
		throw new TypeError("The export format is not valid.");
	}
	return format.id;
}

export function sceneOf(value: unknown): ExportScene {
	const { file, format, target, area, scale, longSide } = bagOf(value);
	if (!(file instanceof Uint8Array) || !isNumber(scale) || !isNumber(longSide) || scale <= 0) {
		throw new TypeError("The export request is not valid.");
	}
	if (target !== null && typeof target !== "string") {
		throw new TypeError("The export target is not valid.");
	}
	return { file, format: formatOf(format), target, area: areaOf(area), scale, longSide };
}

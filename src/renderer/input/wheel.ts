import type { ToolId } from "../components/tools";
import type { Point, ViewportDelta } from "../state/camera";

const DELTA_LINE = 1;
const DELTA_PAGE = 2;
const LINE_PIXELS = 16;
const PAGE_PIXELS = 400;
const ZOOM_PER_PIXEL = 1 / 200;
const NO_PAN: Point = { x: 0, y: 0 };

export interface WheelInput {
	ctrlKey: boolean;
	deltaMode: number;
	deltaX: number;
	deltaY: number;
}

function pixelStep(deltaMode: number): number {
	if (deltaMode === DELTA_LINE) {
		return LINE_PIXELS;
	}
	return deltaMode === DELTA_PAGE ? PAGE_PIXELS : 1;
}

function pixelsOf(wheel: WheelInput): Point {
	const step = pixelStep(wheel.deltaMode);
	return { x: wheel.deltaX * step, y: wheel.deltaY * step };
}

export function wheelDelta(wheel: WheelInput, tool: ToolId): ViewportDelta {
	const pixels = pixelsOf(wheel);
	if (wheel.ctrlKey || tool === "hand") {
		return { pan: NO_PAN, scale: Math.exp(-pixels.y * ZOOM_PER_PIXEL) };
	}
	return { pan: { x: -pixels.x, y: -pixels.y }, scale: 1 };
}

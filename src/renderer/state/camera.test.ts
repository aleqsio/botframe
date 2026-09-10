import { describe, expect, it } from "vitest";
import {
	IDENTITY_CAMERA,
	MAX_ZOOM,
	MIN_ZOOM,
	applyViewportDelta,
	cameraTransform,
	moveCamera,
	toCanvasPoint,
	viewportCenter,
	zoomCameraAt,
} from "./camera";
import type { Camera, Point } from "./camera";

const POINTER: Point = { x: 380, y: 240 };

function toStagePoint(camera: Camera, point: Point): Point {
	return { x: camera.x + point.x * camera.zoom, y: camera.y + point.y * camera.zoom };
}

describe("toCanvasPoint", () => {
	it("gives the stage point back when the camera is the identity camera", () => {
		expect(toCanvasPoint(IDENTITY_CAMERA, { x: 460, y: 300 })).toEqual({ x: 460, y: 300 });
	});

	it("takes a point back to the canvas under a pan and a zoom", () => {
		const camera: Camera = { x: 120, y: -40, zoom: 2.5 };
		const point: Point = { x: 420, y: 260 };

		const back = toCanvasPoint(camera, toStagePoint(camera, point));

		expect(back.x).toBeCloseTo(point.x, 10);
		expect(back.y).toBeCloseTo(point.y, 10);
	});

	it("divides the distance from the camera by the zoom", () => {
		expect(toCanvasPoint({ x: 100, y: 50, zoom: 2 }, { x: 300, y: 150 })).toEqual({
			x: 100,
			y: 50,
		});
	});
});

describe("moveCamera", () => {
	it("adds the stage delta to the camera and keeps the zoom", () => {
		expect(moveCamera({ x: 100, y: 50, zoom: 2 }, { x: -30, y: 12 })).toEqual({
			x: 70,
			y: 62,
			zoom: 2,
		});
	});

	it("moves the canvas under the stage point by the delta divided by the zoom", () => {
		const camera = moveCamera({ x: 0, y: 0, zoom: 4 }, { x: 40, y: -20 });

		const canvas = toCanvasPoint(camera, POINTER);

		expect(canvas.x).toBeCloseTo((POINTER.x - 40) / 4, 9);
		expect(canvas.y).toBeCloseTo((POINTER.y + 20) / 4, 9);
	});
});

describe("zoomCameraAt", () => {
	it("keeps the canvas point under the stage point", () => {
		const camera: Camera = { x: 120, y: -40, zoom: 1.5 };
		const before = toCanvasPoint(camera, POINTER);

		const after = toCanvasPoint(zoomCameraAt(camera, POINTER, 2.5), POINTER);

		expect(after.x).toBeCloseTo(before.x, 9);
		expect(after.y).toBeCloseTo(before.y, 9);
	});

	it("multiplies the zoom by the scale", () => {
		expect(zoomCameraAt({ x: 0, y: 0, zoom: 1.5 }, POINTER, 2).zoom).toBeCloseTo(3, 9);
	});

	it("stops at the smallest zoom and still holds the point", () => {
		const camera: Camera = { x: 60, y: 30, zoom: MIN_ZOOM * 2 };
		const before = toCanvasPoint(camera, POINTER);

		const zoomed = zoomCameraAt(camera, POINTER, 0.001);

		const held = toCanvasPoint(zoomed, POINTER);

		expect(zoomed.zoom).toBe(MIN_ZOOM);
		expect(held.x).toBeCloseTo(before.x, 9);
		expect(held.y).toBeCloseTo(before.y, 9);
	});

	it("stops at the largest zoom and still holds the point", () => {
		const camera: Camera = { x: 60, y: 30, zoom: MAX_ZOOM / 2 };
		const before = toCanvasPoint(camera, POINTER);

		const zoomed = zoomCameraAt(camera, POINTER, 1000);

		const held = toCanvasPoint(zoomed, POINTER);

		expect(zoomed.zoom).toBe(MAX_ZOOM);
		expect(held.x).toBeCloseTo(before.x, 9);
		expect(held.y).toBeCloseTo(before.y, 9);
	});
});

describe("applyViewportDelta", () => {
	it("moves first and scales about the point after the move", () => {
		const camera: Camera = { x: 10, y: 20, zoom: 1.25 };
		const delta = { pan: { x: 44, y: -18 }, scale: 1.8 };

		const applied = applyViewportDelta(camera, POINTER, delta);

		expect(applied).toEqual(zoomCameraAt(moveCamera(camera, delta.pan), POINTER, delta.scale));
	});

	it("takes a stage point back to the canvas point that a move and a scale put under it", () => {
		const camera: Camera = { x: -80, y: 140, zoom: 0.75 };
		const canvas = toCanvasPoint(camera, { x: 500, y: 300 });

		const moved = moveCamera(camera, { x: -120, y: 60 });
		const scaled = zoomCameraAt(moved, POINTER, 3);

		const back = toCanvasPoint(scaled, toStagePoint(scaled, canvas));

		expect(back.x).toBeCloseTo(canvas.x, 9);
		expect(back.y).toBeCloseTo(canvas.y, 9);
	});
});

describe("cameraTransform", () => {
	it("pans first and zooms after", () => {
		expect(cameraTransform({ x: 12, y: -8, zoom: 1.5 })).toBe("translate(12px, -8px) scale(1.5)");
	});

	it("writes the identity camera with no pan and no zoom", () => {
		expect(cameraTransform(IDENTITY_CAMERA)).toBe("translate(0px, 0px) scale(1)");
	});
});

describe("viewportCenter", () => {
	it("gives the canvas point at the middle of the viewport", () => {
		expect(viewportCenter(IDENTITY_CAMERA, { width: 800, height: 600 })).toEqual({
			x: 400,
			y: 300,
		});
	});

	it("follows the camera pan and the zoom", () => {
		expect(viewportCenter({ x: -100, y: -50, zoom: 2 }, { width: 800, height: 600 })).toEqual({
			x: 250,
			y: 175,
		});
	});
});

import { describe, expect, it } from "vitest";
import { IDENTITY_CAMERA, cameraTransform, toCanvasPoint } from "./camera";
import type { Camera, Point } from "./camera";

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

describe("cameraTransform", () => {
	it("pans first and zooms after", () => {
		expect(cameraTransform({ x: 12, y: -8, zoom: 1.5 })).toBe("translate(12px, -8px) scale(1.5)");
	});

	it("writes the identity camera with no pan and no zoom", () => {
		expect(cameraTransform(IDENTITY_CAMERA)).toBe("translate(0px, 0px) scale(1)");
	});
});

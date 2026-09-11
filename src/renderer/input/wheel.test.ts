import { describe, expect, it } from "vitest";
import { sidewaysPixels, wheelDelta } from "./wheel";
import type { WheelInput } from "./wheel";

const PIXEL_MODE = 0;
const LINE_MODE = 1;
const PAGE_MODE = 2;

const NO_PAN = { x: 0, y: 0 };

function wheel(part: Partial<WheelInput>): WheelInput {
	return { ctrlKey: false, deltaMode: PIXEL_MODE, deltaX: 0, deltaY: 0, ...part };
}

describe("wheelDelta", () => {
	it("scales with each tool when the control key is down", () => {
		const zoomIn = wheelDelta(wheel({ ctrlKey: true, deltaY: -100 }), "select");
		const zoomOut = wheelDelta(wheel({ ctrlKey: true, deltaY: 100 }), "rectangle");

		expect(zoomIn.pan).toEqual(NO_PAN);
		expect(zoomIn.scale).toBeGreaterThan(1);
		expect(zoomOut.pan).toEqual(NO_PAN);
		expect(zoomOut.scale).toBeLessThan(1);
		expect(zoomIn.scale * zoomOut.scale).toBeCloseTo(1, 9);
	});

	it("scales with no control key when the hand tool is active", () => {
		const delta = wheelDelta(wheel({ deltaY: -100 }), "hand");

		expect(delta.pan).toEqual(NO_PAN);
		expect(delta.scale).toBeGreaterThan(1);
	});

	it("moves the canvas against the delta with no control key and a different tool", () => {
		expect(wheelDelta(wheel({ deltaX: 40, deltaY: -25 }), "select")).toEqual({
			pan: { x: -40, y: 25 },
			scale: 1,
		});
	});

	it("holds the scale of the canvas while it moves the canvas", () => {
		expect(wheelDelta(wheel({ deltaY: 120 }), "ellipse").scale).toBe(1);
	});

	it("counts a line delta and a page delta as more pixels than a pixel delta", () => {
		const pixels = wheelDelta(wheel({ deltaY: 3 }), "select").pan.y;
		const lines = wheelDelta(wheel({ deltaMode: LINE_MODE, deltaY: 3 }), "select").pan.y;
		const pages = wheelDelta(wheel({ deltaMode: PAGE_MODE, deltaY: 3 }), "select").pan.y;

		expect(pixels).toBe(-3);
		expect(lines).toBe(-48);
		expect(pages).toBe(-1200);
	});

	it("counts a line delta for the scale as well", () => {
		const lines = wheelDelta(wheel({ ctrlKey: true, deltaMode: LINE_MODE, deltaY: -1 }), "select");
		const pixels = wheelDelta(wheel({ ctrlKey: true, deltaY: -16 }), "select");

		expect(lines.scale).toBeCloseTo(pixels.scale, 9);
	});

	it("holds the camera still for a wheel event with no delta", () => {
		const moved = wheelDelta(wheel({}), "select");
		const scaled = wheelDelta(wheel({ ctrlKey: true }), "select");

		expect(moved.pan.x).toBeCloseTo(0, 9);
		expect(moved.pan.y).toBeCloseTo(0, 9);
		expect(moved.scale).toBe(1);
		expect(scaled.pan).toEqual(NO_PAN);
		expect(scaled.scale).toBe(1);
	});
});

describe("sidewaysPixels", () => {
	it("turns a mostly vertical wheel into a sideways pixel delta", () => {
		expect(sidewaysPixels(wheel({ deltaY: 40 }))).toBe(40);
		expect(sidewaysPixels(wheel({ deltaX: 5, deltaY: -25 }))).toBe(-25);
		expect(sidewaysPixels(wheel({ deltaMode: LINE_MODE, deltaY: 3 }))).toBe(48);
	});

	it("gives no delta for a mostly horizontal wheel, which scrolls the row itself", () => {
		expect(sidewaysPixels(wheel({ deltaX: 30, deltaY: 10 }))).toBe(0);
		expect(sidewaysPixels(wheel({}))).toBe(0);
	});
});

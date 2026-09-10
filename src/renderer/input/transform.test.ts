import { describe, expect, it } from "vitest";
import type { Layer } from "../../document/layer";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import {
	MIN_LAYER_SIZE,
	ROTATE_STEP_ALT,
	ROTATE_STEP_SHIFT,
	resizedRect,
	rotatedDegrees,
} from "./transform";

const ALT: Modifiers = { shift: false, alt: true };
const SHIFT: Modifiers = { shift: true, alt: false };

function layerAt(rotation: number): Layer {
	return {
		id: "1@1",
		x: 100,
		y: 100,
		width: 200,
		height: 100,
		rotation,
		fill: "#000000",
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0 },
	};
}

const FLAT = layerAt(0);
const CENTER = { x: 200, y: 150 };

function pointAround(degrees: number): { x: number; y: number } {
	const radians = (degrees * Math.PI) / 180;
	return { x: CENTER.x + 100 * Math.cos(radians), y: CENTER.y + 100 * Math.sin(radians) };
}

describe("resizedRect", () => {
	it("holds the opposite corner in place when a corner handle moves", () => {
		expect(resizedRect(FLAT, "se", { x: 400, y: 300 }, NO_MODIFIERS)).toEqual({
			x: 100,
			y: 100,
			width: 300,
			height: 200,
		});
		expect(resizedRect(FLAT, "nw", { x: 150, y: 120 }, NO_MODIFIERS)).toEqual({
			x: 150,
			y: 120,
			width: 150,
			height: 80,
		});
	});

	it("moves one axis only when a side handle moves", () => {
		expect(resizedRect(FLAT, "e", { x: 400, y: 300 }, NO_MODIFIERS)).toEqual({
			x: 100,
			y: 100,
			width: 300,
			height: 100,
		});
		expect(resizedRect(FLAT, "n", { x: 400, y: 60 }, NO_MODIFIERS)).toEqual({
			x: 100,
			y: 60,
			width: 200,
			height: 140,
		});
	});

	it("keeps the aspect ratio with shift, from a corner and from a side", () => {
		expect(resizedRect(FLAT, "se", { x: 400, y: 300 }, SHIFT)).toEqual({
			x: 100,
			y: 100,
			width: 400,
			height: 200,
		});
		expect(resizedRect(FLAT, "e", { x: 400, y: 300 }, SHIFT)).toEqual({
			x: 100,
			y: 75,
			width: 300,
			height: 150,
		});
	});

	it("scales from the center with alt, and keeps the aspect ratio with both", () => {
		expect(resizedRect(FLAT, "se", { x: 400, y: 300 }, ALT)).toEqual({
			x: 0,
			y: 0,
			width: 400,
			height: 300,
		});
		expect(resizedRect(FLAT, "e", { x: 400, y: 300 }, { shift: true, alt: true })).toEqual({
			x: 0,
			y: 50,
			width: 400,
			height: 200,
		});
	});

	it("holds a minimum size when the handle passes the opposite edge", () => {
		expect(resizedRect(FLAT, "se", { x: 100, y: 100 }, NO_MODIFIERS)).toMatchObject({
			width: MIN_LAYER_SIZE,
			height: MIN_LAYER_SIZE,
		});
	});

	it("resizes a turned layer along its own axes", () => {
		expect(resizedRect(layerAt(90), "se", { x: 150, y: 270 }, NO_MODIFIERS)).toEqual({
			x: 90,
			y: 110,
			width: 220,
			height: 100,
		});
	});
});

describe("rotatedDegrees", () => {
	it("turns the layer by the angle the pointer sweeps around the center", () => {
		expect(rotatedDegrees(FLAT, pointAround(0), pointAround(90), NO_MODIFIERS)).toBeCloseTo(90);
		expect(rotatedDegrees(FLAT, pointAround(0), pointAround(-90), NO_MODIFIERS)).toBeCloseTo(270);
	});

	it("adds the sweep to the angle the layer already holds", () => {
		expect(rotatedDegrees(layerAt(30), pointAround(0), pointAround(40), NO_MODIFIERS)).toBeCloseTo(
			70,
		);
	});

	it("steps by five degrees with alt and by fifteen degrees with shift", () => {
		expect(rotatedDegrees(FLAT, pointAround(0), pointAround(97), ALT)).toBeCloseTo(
			ROTATE_STEP_ALT * 19,
		);
		expect(rotatedDegrees(FLAT, pointAround(0), pointAround(97), SHIFT)).toBeCloseTo(
			ROTATE_STEP_SHIFT * 6,
		);
	});
});

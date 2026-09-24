import { describe, expect, it } from "vitest";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer } from "../../document/layer";
import { DEFAULT_DRAW_SIZE, drawnRect, levelRect, tappedRect } from "./draw";
import { MIN_LAYER_SIZE } from "./transform";

const ORIGIN = { x: 100, y: 100 };
const SHIFT: Modifiers = { shift: true, alt: false, control: false };
const ALT: Modifiers = { shift: false, alt: true, control: false };
const SHIFT_ALT: Modifiers = { shift: true, alt: true, control: false };

describe("drawnRect", () => {
	it("draws the box from the origin to the point", () => {
		expect(drawnRect(ORIGIN, { x: 260, y: 220 }, NO_MODIFIERS)).toEqual({
			x: 100,
			y: 100,
			width: 160,
			height: 120,
		});
	});

	it("draws a positive box when the drag goes up and to the left", () => {
		expect(drawnRect(ORIGIN, { x: 40, y: 30 }, NO_MODIFIERS)).toEqual({
			x: 40,
			y: 30,
			width: 60,
			height: 70,
		});
	});

	it("holds a square on the larger extent with shift, and keeps the direction", () => {
		expect(drawnRect(ORIGIN, { x: 260, y: 220 }, SHIFT)).toEqual({
			x: 100,
			y: 100,
			width: 160,
			height: 160,
		});
		expect(drawnRect(ORIGIN, { x: 40, y: 30 }, SHIFT)).toEqual({
			x: 30,
			y: 30,
			width: 70,
			height: 70,
		});
	});

	it("holds a square that grows to the right when the drag goes straight down with shift", () => {
		expect(drawnRect(ORIGIN, { x: 100, y: 200 }, SHIFT)).toEqual({
			x: 100,
			y: 100,
			width: 100,
			height: 100,
		});
	});

	it("grows from the origin as the center with alt", () => {
		expect(drawnRect(ORIGIN, { x: 160, y: 140 }, ALT)).toEqual({
			x: 40,
			y: 60,
			width: 120,
			height: 80,
		});
	});

	it("holds a square about the origin with shift and alt together", () => {
		expect(drawnRect(ORIGIN, { x: 160, y: 140 }, SHIFT_ALT)).toEqual({
			x: 40,
			y: 40,
			width: 120,
			height: 120,
		});
	});

	it("keeps the smallest size the document accepts when the drag holds still", () => {
		expect(drawnRect(ORIGIN, ORIGIN, NO_MODIFIERS)).toEqual({
			x: 100,
			y: 100,
			width: MIN_LAYER_SIZE,
			height: MIN_LAYER_SIZE,
		});
		expect(drawnRect(ORIGIN, ORIGIN, ALT)).toEqual({
			x: 100 - MIN_LAYER_SIZE / 2,
			y: 100 - MIN_LAYER_SIZE / 2,
			width: MIN_LAYER_SIZE,
			height: MIN_LAYER_SIZE,
		});
	});
});

describe("tappedRect", () => {
	it("places a box of the default size with its top left corner on the point", () => {
		expect(tappedRect(ORIGIN)).toEqual({
			x: 100,
			y: 100,
			width: DEFAULT_DRAW_SIZE,
			height: DEFAULT_DRAW_SIZE,
		});
	});
});

describe("levelRect", () => {
	const BOX = { x: 0, y: 0, width: 200, height: 100 };
	const PARENT: Layer = {
		id: "1@1",
		parent: null,
		...BOX,
		...pixelBox(BOX),
		rotation: 30,
		mirrored: true,
		fill: "#ffffff",
		name: "",
		clip: false,
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
	};

	it("mirrors and turns a layer drawn in a mirrored parent, so it stands level on the screen", () => {
		expect(levelRect([PARENT], { x: 10, y: 10, width: 20, height: 20 })).toMatchObject({
			rotation: 30,
			mirrored: true,
		});
	});
});

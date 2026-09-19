import { describe, expect, it } from "vitest";
import type { Rect } from "../../document/layer";
import { flowIndexOf } from "./flowDrag";

const ROW: readonly Rect[] = [
	{ x: 0, y: 0, width: 40, height: 20 },
	{ x: 50, y: 0, width: 40, height: 20 },
	{ x: 100, y: 0, width: 40, height: 20 },
];

const COLUMN: readonly Rect[] = [
	{ x: 0, y: 0, width: 20, height: 40 },
	{ x: 0, y: 50, width: 20, height: 40 },
	{ x: 0, y: 100, width: 20, height: 40 },
];

const WRAPPED: readonly Rect[] = [
	{ x: 0, y: 0, width: 40, height: 20 },
	{ x: 50, y: 0, width: 40, height: 20 },
	{ x: 0, y: 30, width: 40, height: 20 },
	{ x: 50, y: 30, width: 40, height: 20 },
];

describe("flowIndexOf", () => {
	it("counts the boxes whose middle the pointer has passed on the main axis", () => {
		expect(flowIndexOf(ROW, "row", { x: 5, y: 10 })).toBe(0);
		expect(flowIndexOf(ROW, "row", { x: 25, y: 10 })).toBe(1);
		expect(flowIndexOf(ROW, "row", { x: 75, y: 10 })).toBe(2);
		expect(flowIndexOf(ROW, "row", { x: 200, y: 10 })).toBe(3);
	});

	it("reads the main axis of a column down the screen", () => {
		expect(flowIndexOf(COLUMN, "column", { x: 10, y: 5 })).toBe(0);
		expect(flowIndexOf(COLUMN, "column", { x: 10, y: 75 })).toBe(2);
	});

	it("counts a whole line that the pointer has passed", () => {
		expect(flowIndexOf(WRAPPED, "row", { x: 5, y: 40 })).toBe(2);
		expect(flowIndexOf(WRAPPED, "row", { x: 75, y: 40 })).toBe(4);
		expect(flowIndexOf(WRAPPED, "row", { x: 75, y: 10 })).toBe(2);
	});
});

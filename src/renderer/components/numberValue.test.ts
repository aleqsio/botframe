import { describe, expect, it } from "vitest";
import { boundValue, draggedValue, formatNumber, roundNumber } from "./numberValue";
import type { Bound } from "./numberValue";

const SIZE: Bound = { kind: "clamp", min: 1, max: 100 };
const TURN: Bound = { kind: "wrap", min: 0, max: 360 };

describe("boundValue", () => {
	it("holds a value between the minimum and the maximum of a clamp", () => {
		expect(boundValue(SIZE, 50)).toBe(50);
		expect(boundValue(SIZE, -20)).toBe(1);
		expect(boundValue(SIZE, 500)).toBe(100);
	});

	it("wraps a value at each end of the span", () => {
		expect(boundValue(TURN, 0)).toBe(0);
		expect(boundValue(TURN, 360)).toBe(0);
		expect(boundValue(TURN, 359)).toBe(359);
		expect(boundValue(TURN, 370)).toBe(10);
		expect(boundValue(TURN, -10)).toBe(350);
		expect(boundValue(TURN, -370)).toBe(350);
	});
});

describe("draggedValue", () => {
	it("adds one step for each pixel of the drag", () => {
		expect(draggedValue({ start: 20, moved: 40, step: 1, bound: SIZE })).toBe(60);
		expect(draggedValue({ start: 60, moved: -40, step: 1, bound: SIZE })).toBe(20);
	});

	it("multiplies the pixels by the step", () => {
		expect(draggedValue({ start: 20, moved: 4, step: 10, bound: SIZE })).toBe(60);
		expect(draggedValue({ start: 20, moved: 4, step: 0.1, bound: SIZE })).toBe(20.4);
	});

	it("gives the value of the start when the pointer does not move", () => {
		expect(draggedValue({ start: 37.5, moved: 0, step: 10, bound: SIZE })).toBe(37.5);
	});

	it("holds the value of a drag inside the bound", () => {
		expect(draggedValue({ start: 20, moved: -400, step: 1, bound: SIZE })).toBe(1);
		expect(draggedValue({ start: 350, moved: 20, step: 1, bound: TURN })).toBe(10);
	});

	it("cuts the value of a small step to two decimals", () => {
		expect(draggedValue({ start: 20, moved: 3, step: 0.1, bound: SIZE })).toBe(20.3);
	});
});

describe("roundNumber", () => {
	it("cuts a number to two decimals", () => {
		expect(roundNumber(37.423_42)).toBe(37.42);
	});
});

describe("formatNumber", () => {
	it("writes a whole number with no decimal point", () => {
		expect(formatNumber(240)).toBe("240");
	});

	it("cuts an angle from a drag to two decimals", () => {
		expect(formatNumber(37.423_42)).toBe("37.42");
		expect(formatNumber(-0.004)).toBe("0");
	});
});

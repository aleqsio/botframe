import { describe, expect, it } from "vitest";
import {
	NO_BASIS,
	availableUnits,
	hasRelativeLength,
	isUnit,
	lengthIn,
	parseLength,
	resolveLength,
} from "./length";
import type { Basis, LayerLengths } from "./length";

const BASIS: Basis = { container: { width: 200, height: 100 }, root: { width: 400, height: 800 } };

const PIXEL_LENGTHS: LayerLengths = {
	x: { value: 1, unit: "px" },
	y: { value: 2, unit: "px" },
	width: { value: 3, unit: "px" },
	height: { value: 4, unit: "px" },
};

describe("resolveLength", () => {
	it("gives a pixel length as it stands", () => {
		expect(resolveLength({ value: 42, unit: "px" }, "width", BASIS)).toBe(42);
	});

	it("takes a percentage from the container, along the axis of the field", () => {
		expect(resolveLength({ value: 50, unit: "%" }, "width", BASIS)).toBe(100);
		expect(resolveLength({ value: 50, unit: "%" }, "height", BASIS)).toBe(50);
	});

	it("takes vw from the width of the root and vh from its height", () => {
		expect(resolveLength({ value: 10, unit: "vw" }, "height", BASIS)).toBe(40);
		expect(resolveLength({ value: 10, unit: "vh" }, "width", BASIS)).toBe(80);
	});

	it("gives zero for a relative length that has no basis", () => {
		expect(resolveLength({ value: 50, unit: "%" }, "width", NO_BASIS)).toBe(0);
	});
});

describe("lengthIn", () => {
	it("writes pixels as the unit the caller asks for", () => {
		expect(lengthIn(100, "%", "width", BASIS)).toEqual({ value: 50, unit: "%" });
		expect(lengthIn(40, "vw", "width", BASIS)).toEqual({ value: 10, unit: "vw" });
		expect(lengthIn(40, "px", "width", BASIS)).toEqual({ value: 40, unit: "px" });
	});

	it("cuts the value to two decimals", () => {
		expect(lengthIn(100, "%", "height", { ...BASIS, container: { width: 3, height: 3 } })).toEqual({
			value: 3333.33,
			unit: "%",
		});
	});

	it("gives zero for a unit that has no basis", () => {
		expect(lengthIn(100, "%", "width", NO_BASIS)).toEqual({ value: 0, unit: "%" });
	});
});

describe("availableUnits", () => {
	it("offers each unit that has a basis", () => {
		expect(availableUnits("width", BASIS)).toEqual(["px", "%", "vw", "vh"]);
	});

	it("offers pixels only to a layer that has no container", () => {
		expect(availableUnits("width", NO_BASIS)).toEqual(["px"]);
	});
});

describe("parseLength", () => {
	it("reads the unit a person types", () => {
		expect(parseLength("5%", "px")).toEqual({ value: 5, unit: "%" });
		expect(parseLength("12px", "%")).toEqual({ value: 12, unit: "px" });
		expect(parseLength(" 3 VW ", "px")).toEqual({ value: 3, unit: "vw" });
	});

	it("keeps the unit of the field when the text names no unit", () => {
		expect(parseLength("40", "%")).toEqual({ value: 40, unit: "%" });
		expect(parseLength("-2.5", "px")).toEqual({ value: -2.5, unit: "px" });
	});

	it("refuses text that is not a length", () => {
		expect(parseLength("wide", "px")).toBeNull();
		expect(parseLength("5em", "px")).toBeNull();
		expect(parseLength("", "px")).toBeNull();
	});
});

describe("isUnit", () => {
	it("names the units the document writes", () => {
		expect(isUnit("vh")).toBe(true);
		expect(isUnit("rem")).toBe(false);
	});
});

describe("hasRelativeLength", () => {
	it("is true when one field of the box is not in pixels", () => {
		expect(hasRelativeLength(PIXEL_LENGTHS)).toBe(false);
		expect(hasRelativeLength({ ...PIXEL_LENGTHS, y: { value: 2, unit: "vh" } })).toBe(true);
	});
});

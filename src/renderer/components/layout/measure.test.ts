import { describe, expect, it } from "vitest";
import { MARGIN_UNITS, SPACING_UNITS } from "../../../document/layout";
import { marginMeasure, marginSideOf, measureText, parseMeasure } from "./measure";

describe("the margin measure", () => {
	it("reads auto as a measure the field can show", () => {
		expect(marginMeasure({ unit: "auto" })).toEqual({ value: 0, unit: "auto" });
	});

	it("keeps a length", () => {
		expect(marginMeasure({ value: 8, unit: "px" })).toEqual({ value: 8, unit: "px" });
	});

	it("writes auto back without a value", () => {
		expect(marginSideOf({ value: 12, unit: "auto" })).toEqual({ unit: "auto" });
		expect(marginSideOf({ value: 12, unit: "%" })).toEqual({ value: 12, unit: "%" });
	});
});

describe("measureText", () => {
	it("shows the word auto in place of a number", () => {
		expect(measureText({ value: 0, unit: "auto" })).toBe("auto");
		expect(measureText({ value: 8, unit: "px" })).toBe("8");
	});
});

describe("parseMeasure", () => {
	it("reads a number with the unit of the field", () => {
		expect(parseMeasure("12", SPACING_UNITS, "rem")).toEqual({ value: 12, unit: "rem" });
	});

	it("reads a unit that the text names", () => {
		expect(parseMeasure("4REM", SPACING_UNITS, "px")).toEqual({ value: 4, unit: "rem" });
		expect(parseMeasure(" 50 % ", SPACING_UNITS, "px")).toEqual({ value: 50, unit: "%" });
	});

	it("reads the word auto when the field takes it", () => {
		expect(parseMeasure("Auto", MARGIN_UNITS, "px")).toEqual({ value: 0, unit: "auto" });
		expect(parseMeasure("auto", SPACING_UNITS, "px")).toBeNull();
	});

	it("refuses a unit the field does not take, and text that is not a length", () => {
		expect(parseMeasure("3fr", SPACING_UNITS, "px")).toBeNull();
		expect(parseMeasure("wide", MARGIN_UNITS, "px")).toBeNull();
		expect(parseMeasure("", SPACING_UNITS, "px")).toBeNull();
	});
});

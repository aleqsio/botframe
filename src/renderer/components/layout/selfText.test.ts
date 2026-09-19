import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT } from "../../../document/layout";
import type { LayerLayout } from "../../../document/layout";
import { contextText, isFlex, placementText } from "./selfText";

function layoutWith(patch: Partial<LayerLayout>): LayerLayout {
	return { ...DEFAULT_LAYOUT, ...patch };
}

describe("contextText", () => {
	it("names the display of the parent", () => {
		expect(contextText(layoutWith({ display: "block" }))).toBe("in Block");
		expect(contextText(layoutWith({ display: "row" }))).toBe("in Flex row");
		expect(contextText(layoutWith({ display: "column" }))).toBe("in Flex column");
		expect(contextText(layoutWith({ display: "grid" }))).toBe("in Grid");
	});

	it("reads a layer that has no parent as a block", () => {
		expect(contextText(null)).toBe("in Block");
	});

	it("adds the wrap suffix to a flex parent that wraps", () => {
		expect(contextText(layoutWith({ display: "row", wrap: true }))).toBe("in Flex row · wrap");
		expect(contextText(layoutWith({ display: "grid", wrap: true }))).toBe("in Grid");
		expect(contextText(layoutWith({ display: "block", wrap: true }))).toBe("in Block");
	});
});

describe("isFlex", () => {
	it("holds for a row and a column only", () => {
		expect([isFlex("row"), isFlex("column"), isFlex("grid"), isFlex("block")]).toEqual([
			true,
			true,
			false,
			false,
		]);
	});
});

describe("placementText", () => {
	it("names one cell", () => {
		const cell = {
			mode: "place",
			column: { start: 2, end: 3 },
			row: { start: 1, end: 2 },
		} as const;
		expect(placementText(cell)).toBe("column 2, row 1");
	});

	it("names the lines of a span", () => {
		const cell = {
			mode: "place",
			column: { start: 2, end: 4 },
			row: { start: 1, end: 3 },
		} as const;
		expect(placementText(cell)).toBe("column 2 to 4, row 1 to 3");
	});

	it("tells that the grid places the layer", () => {
		expect(placementText({ mode: "auto" })).toBe("auto placement, layer order decides the cell");
	});
});

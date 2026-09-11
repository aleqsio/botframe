import { describe, expect, it } from "vitest";
import { pixelBox } from "../document/documentFixtures";
import type { Layer } from "../document/layer";
import { canvasLabelStyle, hasCanvasLabel } from "./canvasLabel";

const ARTBOARD: Layer = {
	id: "1@1",
	x: 40,
	y: 60,
	width: 393,
	height: 852,
	...pixelBox({ x: 40, y: 60, width: 393, height: 852 }),
	rotation: 0,
	fill: "#ffffff",
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
	name: "iPhone 16",
	clip: true,
	parent: null,
};

describe("hasCanvasLabel", () => {
	it("labels an artboard at the root of the document", () => {
		expect(hasCanvasLabel(ARTBOARD)).toBe(true);
	});

	it("gives no label to a nested artboard or to a rectangle at the root", () => {
		expect(hasCanvasLabel({ ...ARTBOARD, parent: "2@1" })).toBe(false);
		expect(
			hasCanvasLabel({
				...ARTBOARD,
				geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
			}),
		).toBe(false);
		expect(hasCanvasLabel({ ...ARTBOARD, geometry: { kind: "ellipse" } })).toBe(false);
	});
});

describe("canvasLabelStyle", () => {
	it("puts the label at the corner of the artboard and holds it to the width on the screen", () => {
		expect(canvasLabelStyle(ARTBOARD)).toEqual({
			translate: "40px 60px",
			maxWidth: "calc(393px * var(--zoom))",
		});
	});
});

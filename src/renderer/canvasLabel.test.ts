import { describe, expect, it } from "vitest";
import { pixelBox } from "../document/documentFixtures";
import type { Layer } from "../document/layer";
import { canvasLabelStyle } from "./canvasLabel";

const BOX = { x: 40, y: 60, width: 393, height: 852 };

const ABOVE_THE_EDGE = "translateY(calc(-100% - var(--layout-space-2)))";
const BELOW_THE_EDGE = "translate(-100%, var(--layout-space-2))";
const WIDTH_ON_SCREEN = "calc(393px * var(--zoom))";

function frame(rotation: number): Layer {
	return {
		id: "1@1",
		...BOX,
		...pixelBox(BOX),
		rotation,
		fill: "#ffffff",
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
		name: "iPhone 16",
		clip: true,
		parent: null,
	};
}

describe("canvasLabelStyle", () => {
	it("puts the label at the corner of the frame and holds it to the width on the screen", () => {
		expect(canvasLabelStyle(frame(0))).toEqual({
			translate: "40px 60px",
			rotate: "0deg",
			transform: ABOVE_THE_EDGE,
			maxWidth: WIDTH_ON_SCREEN,
		});
	});

	it("moves the label to the turned corner and turns it with the top edge", () => {
		expect(canvasLabelStyle(frame(30))).toEqual({
			translate: "279.33px 18.82px",
			rotate: "30deg",
			transform: ABOVE_THE_EDGE,
			maxWidth: WIDTH_ON_SCREEN,
		});
	});

	it("keeps the quarter turn, because the text reads down and not upside down", () => {
		expect(canvasLabelStyle(frame(90))).toEqual({
			translate: "662.5px 289.5px",
			rotate: "90deg",
			transform: ABOVE_THE_EDGE,
			maxWidth: WIDTH_ON_SCREEN,
		});
	});

	it("turns the label back up at a half turn and hangs it off the far end of the edge", () => {
		expect(canvasLabelStyle(frame(180))).toEqual({
			translate: "433px 912px",
			rotate: "0deg",
			transform: BELOW_THE_EDGE,
			maxWidth: WIDTH_ON_SCREEN,
		});
	});

	it("turns the label back up for each angle between the quarter turn and the three quarter turn", () => {
		expect(canvasLabelStyle(frame(210))).toEqual({
			translate: "193.67px 953.18px",
			rotate: "30deg",
			transform: BELOW_THE_EDGE,
			maxWidth: WIDTH_ON_SCREEN,
		});
	});

	it("reads a negative angle as its positive turn and leaves it upright", () => {
		expect(canvasLabelStyle(frame(-45))).toEqual({
			translate: "-203.67px 323.72px",
			rotate: "315deg",
			transform: ABOVE_THE_EDGE,
			maxWidth: WIDTH_ON_SCREEN,
		});
	});
});

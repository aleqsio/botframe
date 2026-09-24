import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer } from "../../document/layer";
import { CORNER_GRACE, EDGE_GRACE, ROTATE_REACH, zoneAt } from "./handles";

function layerAt(rotation: number): Layer {
	return {
		id: "1@1",
		x: 100,
		y: 100,
		width: 200,
		height: 100,
		...pixelBox({ x: 100, y: 100, width: 200, height: 100 }),
		rotation,
		skewX: 0,
		skewY: 0,
		mirrored: false,
		fill: "#000000",
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
		name: "",
		clip: false,
		parent: null,
	};
}

const FLAT = layerAt(0);

describe("zoneAt", () => {
	it("takes each corner of the layer, and the grace distance around it", () => {
		expect(zoneAt(FLAT, { x: 100, y: 100 }, 1)).toEqual({ mode: "resize", handle: "nw" });
		expect(zoneAt(FLAT, { x: 300, y: 100 }, 1)).toEqual({ mode: "resize", handle: "ne" });
		expect(zoneAt(FLAT, { x: 300, y: 200 }, 1)).toEqual({ mode: "resize", handle: "se" });
		expect(zoneAt(FLAT, { x: 100, y: 200 }, 1)).toEqual({ mode: "resize", handle: "sw" });
		expect(zoneAt(FLAT, { x: 100 + CORNER_GRACE - 1, y: 100 }, 1)).toEqual({
			mode: "resize",
			handle: "nw",
		});
	});

	it("takes one axis on a side of the layer, inside and outside the edge", () => {
		expect(zoneAt(FLAT, { x: 200, y: 100 }, 1)).toEqual({ mode: "resize", handle: "n" });
		expect(zoneAt(FLAT, { x: 200, y: 200 + EDGE_GRACE }, 1)).toEqual({
			mode: "resize",
			handle: "s",
		});
		expect(zoneAt(FLAT, { x: 100 - EDGE_GRACE, y: 150 }, 1)).toEqual({
			mode: "resize",
			handle: "w",
		});
		expect(zoneAt(FLAT, { x: 300 + EDGE_GRACE, y: 150 }, 1)).toEqual({
			mode: "resize",
			handle: "e",
		});
	});

	it("takes no zone inside the layer or far from a side", () => {
		expect(zoneAt(FLAT, { x: 200, y: 150 }, 1)).toBeNull();
		expect(zoneAt(FLAT, { x: 200, y: 100 - EDGE_GRACE - 1 }, 1)).toBeNull();
	});

	it("rotates outside the corner, and gives up when the pointer goes too far", () => {
		expect(zoneAt(FLAT, { x: 80, y: 80 }, 1)).toEqual({ mode: "rotate", handle: "nw" });
		expect(zoneAt(FLAT, { x: 100 - ROTATE_REACH - 1, y: 100 }, 1)).toBeNull();
	});

	it("holds the grace distance on the screen, not on the canvas", () => {
		const near = { x: 108, y: 100 };
		expect(zoneAt(FLAT, near, 1)).toEqual({ mode: "resize", handle: "nw" });
		expect(zoneAt(FLAT, near, 2)).toEqual({ mode: "resize", handle: "n" });
	});

	it("turns the zones with the rotation of the layer", () => {
		const turned = layerAt(90);
		expect(zoneAt(turned, { x: 250, y: 50 }, 1)).toEqual({ mode: "resize", handle: "nw" });
		expect(zoneAt(turned, { x: 250, y: 150 }, 1)).toEqual({ mode: "resize", handle: "n" });
		expect(zoneAt(turned, { x: 100, y: 100 }, 1)).toBeNull();
	});
});

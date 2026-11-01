import { describe, expect, it } from "vitest";
import type { LayerFields } from "../../document/layer";
import { NO_MODIFIERS } from "./modifiers";
import { dropOver, dropScene } from "./toolFixtures";

const FRAME: LayerFields = {
	x: 100,
	y: 100,
	width: 300,
	height: 200,
	fill: "#ffffff",
	name: "",
	clip: true,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
};

const GRAB = { x: 440, y: 280 };
const OVER_THE_FRAME = { x: 200, y: 160 };
const EMPTY = { x: 700, y: 600 };

describe("a move with Shift held", () => {
	it("keeps the layer at the root over a frame while Shift is held", () => {
		const scene = dropScene(FRAME);

		dropOver(scene, {
			press: GRAB,
			release: OVER_THE_FRAME,
			hits: [scene.layer, scene.into],
			modifiers: { ...NO_MODIFIERS, shift: true },
		});

		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ parent: null });
		expect(scene.target.doc.childIds(scene.into)).toEqual([]);
	});

	it("keeps the layer in its frame off the frame while Shift is held", () => {
		const scene = dropScene(FRAME);
		const doc = scene.target.doc;
		doc.move(scene.layer, scene.into);
		doc.update(scene.layer, { x: 320, y: 160 });

		dropOver(scene, {
			press: GRAB,
			release: EMPTY,
			hits: [scene.layer],
			modifiers: { ...NO_MODIFIERS, shift: true },
		});

		expect(doc.layer(scene.layer)).toMatchObject({ parent: scene.into });
	});
});

import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import { UserState } from "../state/userState";
import { NO_DRAWN } from "./drawn";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { NO_MODIFIERS } from "./modifiers";
import { handleStroke } from "./useKeyInput";
import { NO_HITS, dragOver, pointAt } from "./toolFixtures";

const ESCAPE = {
	key: "Escape",
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
};

const SQUARE: Omit<LayerFields, "x" | "y" | "width" | "height"> = {
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

interface MarqueeScene {
	target: PointerTarget;
	near: LayerId;
	far: LayerId;
	turned: LayerId;
}

function marqueeScene(): MarqueeScene {
	const doc = DesignDocument.create();
	const near = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 20, height: 20 });
	const far = doc.createLayer({ ...SQUARE, x: 200, y: 0, width: 20, height: 20 });
	const turned = doc.createLayer({ ...SQUARE, x: 40, y: 40, width: 60, height: 60 });
	doc.update(turned, { rotation: 45 });
	doc.commit("turn the layer");
	return {
		target: { doc, user: new UserState(), layerIds: [], layerIdsAt: NO_HITS, drawn: NO_DRAWN },
		near,
		far,
		turned,
	};
}

describe("the marquee of the select tool", () => {
	it("takes each layer that the marquee touches", () => {
		const scene = marqueeScene();

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: -10, y: -10 },
			release: { x: 30, y: 30 },
		});

		expect(scene.target.user.selection.get()).toEqual([scene.near]);
	});

	it("takes a rotated layer that the marquee touches but its layout box does not explain", () => {
		const scene = marqueeScene();

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 60, y: 30 },
			release: { x: 80, y: 45 },
		});

		expect(scene.target.user.selection.get()).toEqual([scene.turned]);
	});

	it("passes over a rotated layer whose corner the marquee misses", () => {
		const scene = marqueeScene();

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 38, y: 38 },
			release: { x: 44, y: 44 },
		});

		expect(scene.target.user.selection.get()).toEqual([]);
	});

	it("takes more than one layer in one sweep", () => {
		const scene = marqueeScene();

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: -10, y: -10 },
			release: { x: 230, y: 120 },
		});

		expect(scene.target.user.selection.get()).toEqual([scene.near, scene.far, scene.turned]);
	});

	it("clears the marquee box when the drag ends", () => {
		const scene = marqueeScene();

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: -10, y: -10 },
			release: { x: 30, y: 30 },
		});

		expect(scene.target.user.marquee.get()).toBeNull();
	});

	it("shows the marquee box while the drag runs", () => {
		const scene = marqueeScene();
		const camera = scene.target.user.camera.get();

		behaviorFor("select").dragStart?.(
			scene.target,
			pointAt(camera, { x: 30, y: 30 }),
			pointAt(camera, { x: 5, y: 10 }),
			NO_MODIFIERS,
		);

		expect(scene.target.user.marquee.get()).toEqual({
			origin: { x: 30, y: 30 },
			box: { x: 5, y: 10, width: 25, height: 20 },
		});
	});

	it("stops the sweep and holds the selection after Escape clears the marquee", () => {
		const scene = marqueeScene();
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();

		behavior.dragStart?.(
			scene.target,
			pointAt(camera, { x: -10, y: -10 }),
			pointAt(camera, { x: 30, y: 30 }),
			NO_MODIFIERS,
		);
		handleStroke(scene.target.doc, scene.target.user, ESCAPE);
		behavior.drag?.(scene.target, pointAt(camera, { x: 230, y: 120 }), NO_MODIFIERS);

		expect(scene.target.user.marquee.get()).toBeNull();
		expect(scene.target.user.selection.get()).toEqual([scene.near]);
	});
});

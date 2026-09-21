import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import { UserState } from "../state/userState";
import { cancelGroupMove } from "./groupMove";
import { NO_MODIFIERS } from "./modifiers";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { NO_HITS, dragOver, firstId, pointAt } from "./toolFixtures";

const SMALL: LayerFields = {
	x: 100,
	y: 100,
	width: 100,
	height: 50,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

const CENTER = { x: 540, y: 340 };
const MOVED = { x: 640, y: 410 };
const GROUP_SE = { x: 660, y: 420 };
const GROWN_SE = { x: 940, y: 580 };
const GROUP_SE_REACH = { x: 678, y: 438 };
const ACROSS = { x: 82, y: 82 };

interface Pair {
	target: PointerTarget;
	seed: LayerId;
	small: LayerId;
}

function pairOf(): Pair {
	const doc = DesignDocument.create();
	const seed = firstId(doc);
	const small = doc.createLayer(SMALL);
	doc.commit("create small");
	const user = new UserState();
	user.selection.set([seed, small]);
	return { target: { doc, user, layerIds: [seed], layerIdsAt: NO_HITS }, seed, small };
}

describe("the frame around the selection", () => {
	it("gives the resize zone at the corner of the box around every selected layer", () => {
		const { target } = pairOf();
		const camera = target.user.camera.get();
		const behavior = behaviorFor("select");

		expect(behavior.hover?.(target, pointAt(camera, GROUP_SE))).toEqual({
			mode: "resize",
			handle: "se",
		});
		expect(behavior.hover?.(target, pointAt(camera, { x: 100, y: 100 }))).toEqual({
			mode: "resize",
			handle: "nw",
		});
		expect(behavior.hover?.(target, pointAt(camera, GROUP_SE_REACH))).toEqual({
			mode: "rotate",
			handle: "se",
		});
		expect(behavior.highlight?.(target, pointAt(camera, GROUP_SE))).toBeNull();
	});

	it("scales every selected layer with the box from a corner handle", () => {
		const { target, seed, small } = pairOf();
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("select"), target, { press: GROUP_SE, release: GROWN_SE });

		expect(target.doc.layer(seed)).toMatchObject({ x: 580, y: 340, width: 360, height: 240 });
		expect(target.doc.layer(small)).toMatchObject({ x: 100, y: 100, width: 150, height: 75 });
		expect(target.doc.changeCount()).toBe(changes + 1);
	});

	it("turns every selected layer around the center of the box", () => {
		const { target, seed, small } = pairOf();

		dragOver(behaviorFor("select"), target, { press: GROUP_SE_REACH, release: ACROSS });

		expect(target.doc.layer(seed)).toMatchObject({ x: 100, y: 100, rotation: 180 });
		expect(target.doc.layer(small)).toMatchObject({ x: 560, y: 370, rotation: 180 });
	});
});

describe("a drag of the selection", () => {
	it("moves every selected layer by the delta and commits once", () => {
		const { target, seed, small } = pairOf();
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("select"), target, { press: CENTER, release: MOVED });

		expect(target.doc.layer(seed)).toMatchObject({ x: 520, y: 330 });
		expect(target.doc.layer(small)).toMatchObject({ x: 200, y: 170 });
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.selection.get()).toEqual([seed, small]);
		expect(target.user.groupMove.get()).toBeNull();
	});

	it("puts every selected layer back when the drag is cancelled", () => {
		const { target, seed, small } = pairOf();
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = pointAt(camera, CENTER);

		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		behavior.drag?.(target, pointAt(camera, MOVED), NO_MODIFIERS);
		expect(target.doc.layer(seed)).toMatchObject({ x: 520, y: 330 });

		cancelGroupMove(target.doc, target.user);

		expect(target.doc.layer(seed)).toMatchObject({ x: 420, y: 260 });
		expect(target.doc.layer(small)).toMatchObject({ x: 100, y: 100 });
		expect(target.user.groupMove.get()).toBeNull();
	});

	it("moves one layer alone when the press lands outside the selection", () => {
		const { target, seed, small } = pairOf();
		const apart = target.doc.createLayer({ ...SMALL, x: 700, y: 500 });
		target.doc.commit("create apart");

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIds: [apart] },
			{ press: { x: 750, y: 525 }, release: { x: 760, y: 535 } },
		);

		expect(target.doc.layer(apart)).toMatchObject({ x: 710, y: 510 });
		expect(target.doc.layer(seed)).toMatchObject({ x: 420, y: 260 });
		expect(target.doc.layer(small)).toMatchObject({ x: 100, y: 100 });
		expect(target.user.selection.get()).toEqual([apart]);
	});

	it("moves an unselected child of a selected layer alone, as one selected layer would", () => {
		const { target, seed, small } = pairOf();
		target.doc.update(seed, {
			geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
		});
		const child = target.doc.createLayer({ ...SMALL, x: 10, y: 10 }, seed);
		target.doc.commit("create child");

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIds: [child, seed], layerIdsAt: () => [child, seed] },
			{ press: { x: 440, y: 280 }, release: { x: 460, y: 300 } },
		);

		expect(target.doc.layer(child)).toMatchObject({ x: 30, y: 30 });
		expect(target.doc.layer(seed)).toMatchObject({ x: 420, y: 260 });
		expect(target.doc.layer(small)).toMatchObject({ x: 100, y: 100 });
		expect(target.user.selection.get()).toEqual([child]);
	});
});

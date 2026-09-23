import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import { UserState } from "../state/userState";
import { NO_DRAWN } from "./drawn";
import { cancelGroupMove } from "./groupMove";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { NO_MODIFIERS } from "./modifiers";
import { SQUARE, dragOver, pointAt } from "./toolFixtures";

interface GroupScene {
	target: PointerTarget;
	one: LayerId;
	other: LayerId;
}

function groupScene(): GroupScene {
	const doc = DesignDocument.create();
	const one = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 20, height: 20 });
	const other = doc.createLayer({ ...SQUARE, x: 100, y: 60, width: 20, height: 20 });
	doc.commit("create the layers");
	const user = new UserState();
	user.selection.set([one, other]);
	return {
		target: { doc, user, layerIds: [one], layerIdsAt: () => [one], drawn: NO_DRAWN },
		one,
		other,
	};
}

function placeOf(target: PointerTarget, id: LayerId): { x: number; y: number } {
	const layer = target.doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return { x: layer.x, y: layer.y };
}

describe("a drag on a selection of more than one layer", () => {
	it("carries each selected layer by the same amount", () => {
		const scene = groupScene();

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 10, y: 10 },
			release: { x: 40, y: 25 },
		});

		expect(placeOf(scene.target, scene.one)).toEqual({ x: 30, y: 15 });
		expect(placeOf(scene.target, scene.other)).toEqual({ x: 130, y: 75 });
	});

	it("keeps the selection through the drag", () => {
		const scene = groupScene();

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 10, y: 10 },
			release: { x: 40, y: 25 },
		});

		expect(scene.target.user.selection.get()).toEqual([scene.one, scene.other]);
	});

	it("writes one undo step for the whole selection", () => {
		const scene = groupScene();

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 10, y: 10 },
			release: { x: 40, y: 25 },
		});
		scene.target.doc.undo();

		expect(placeOf(scene.target, scene.one)).toEqual({ x: 0, y: 0 });
		expect(placeOf(scene.target, scene.other)).toEqual({ x: 100, y: 60 });
	});

	it("leaves no group move behind when the drag ends", () => {
		const scene = groupScene();

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 10, y: 10 },
			release: { x: 40, y: 25 },
		});

		expect(scene.target.user.group.get()).toBeNull();
	});
});

describe("cancelGroupMove", () => {
	it("puts each layer back where the press found it", () => {
		const scene = groupScene();
		const camera = scene.target.user.camera.get();

		behaviorFor("select").dragStart?.(
			scene.target,
			pointAt(camera, { x: 10, y: 10 }),
			pointAt(camera, { x: 40, y: 25 }),
			NO_MODIFIERS,
		);
		cancelGroupMove(scene.target.doc, scene.target.user);

		expect(placeOf(scene.target, scene.one)).toEqual({ x: 0, y: 0 });
		expect(placeOf(scene.target, scene.other)).toEqual({ x: 100, y: 60 });
		expect(scene.target.user.group.get()).toBeNull();
	});

	it("does nothing when no group move runs", () => {
		const scene = groupScene();
		const before = scene.target.doc.changeCount();

		cancelGroupMove(scene.target.doc, scene.target.user);

		expect(scene.target.doc.changeCount()).toBe(before);
	});
});

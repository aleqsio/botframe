import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer, LayerId, Rect } from "../../document/layer";
import { UserState } from "../state/userState";
import { NO_DRAWN, drawnRead } from "./drawn";
import { visualCenterOf } from "./layerSpace";
import type { ReadLayer } from "./layerSpace";
import { boundsOf } from "./selectionBounds";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { SQUARE, dragOver, laidOutRow, pointAt } from "./toolFixtures";

interface GroupScene {
	target: PointerTarget;
	one: LayerId;
	other: LayerId;
	box: Rect;
}

function boxOf(read: ReadLayer, ids: readonly LayerId[]): Rect {
	const box = boundsOf(read, ids);
	if (box === null) {
		throw new Error("the selection has no box");
	}
	return box;
}

function groupScene(turn: number): GroupScene {
	const doc = DesignDocument.create();
	const one = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 20, height: 20 });
	const other = doc.createLayer({ ...SQUARE, x: 100, y: 60, width: 20, height: 40 });
	doc.update(other, { rotation: turn });
	doc.commit("create the layers");
	const user = new UserState();
	user.selection.set([one, other]);
	const box = boxOf((id) => doc.layer(id), [one, other]);
	return {
		target: { doc, user, layerIds: [], layerIdsAt: () => [], drawn: NO_DRAWN },
		one,
		other,
		box,
	};
}

function layerOf(target: PointerTarget, id: LayerId): Layer {
	const layer = target.doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function hoverAt(scene: GroupScene, x: number, y: number): string | null {
	const zone = behaviorFor("select").hover?.(
		scene.target,
		pointAt(scene.target.user.camera.get(), { x, y }),
	);
	return zone === null || zone === undefined || zone.mode === "origin"
		? null
		: `${zone.mode}-${zone.handle}`;
}

describe("a resize of more than one layer", () => {
	it("scales each layer uniformly from a corner and keeps each turn", () => {
		const scene = groupScene(30);
		const { box } = scene;
		const center = visualCenterOf(layerOf(scene.target, scene.other));

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: box.x + box.width, y: box.y + box.height },
			release: { x: box.x + box.width * 2, y: box.y + box.height * 2 },
		});

		const one = layerOf(scene.target, scene.one);
		const other = layerOf(scene.target, scene.other);
		expect([one.width, one.height, one.rotation]).toEqual([40, 40, 0]);
		expect(other.width).toBeCloseTo(40);
		expect(other.height).toBeCloseTo(80);
		expect(other.rotation).toBe(30);
		const moved = visualCenterOf(other);
		expect(moved.x).toBeCloseTo(box.x + (center.x - box.x) * 2);
		expect(moved.y).toBeCloseTo(box.y + (center.y - box.y) * 2);
	});

	it("moves the far edge only when an edge scales layers with no turn", () => {
		const scene = groupScene(0);

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 120, y: 50 },
			release: { x: 240, y: 50 },
		});

		const one = layerOf(scene.target, scene.one);
		const other = layerOf(scene.target, scene.other);
		expect([one.x, one.y, one.width, one.height]).toEqual([0, 0, 40, 20]);
		expect([other.x, other.y, other.width, other.height]).toEqual([200, 60, 40, 40]);
	});

	it("scales the height of a layer with a quarter turn when an edge scales the width", () => {
		const scene = groupScene(90);
		const { box } = scene;

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: box.x + box.width, y: box.y + box.height / 2 },
			release: { x: box.x + box.width * 2, y: box.y + box.height / 2 },
		});

		const other = layerOf(scene.target, scene.other);
		expect(other.width).toBeCloseTo(20);
		expect(other.height).toBeCloseTo(80);
		expect(other.rotation).toBe(90);
	});

	it("gives no edge handle when a layer has a turn of 30 degrees", () => {
		const scene = groupScene(30);
		const { box } = scene;

		expect(hoverAt(scene, box.x + box.width, box.y + box.height / 2)).toBeNull();
		expect(hoverAt(scene, box.x + box.width, box.y + box.height)).toBe("resize-se");
	});

	it("gives an edge handle when no layer has a turn", () => {
		const scene = groupScene(0);

		expect(hoverAt(scene, 120, 50)).toBe("resize-e");
	});

	it("writes one undo step for the whole selection", () => {
		const scene = groupScene(0);

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 120, y: 100 },
			release: { x: 240, y: 200 },
		});
		const resized = layerOf(scene.target, scene.other);
		scene.target.doc.undo();

		expect([resized.width, resized.height]).toEqual([40, 80]);
		const one = layerOf(scene.target, scene.one);
		const other = layerOf(scene.target, scene.other);
		expect([one.x, one.y, one.width, one.height]).toEqual([0, 0, 20, 20]);
		expect([other.x, other.y, other.width, other.height]).toEqual([100, 60, 20, 40]);
	});

	it("gives no handle when a selected layer sits in a flow", () => {
		const { target, ids } = laidOutRow();
		const pair = ids.slice(0, 2);
		target.user.selection.set(pair);
		const box = boxOf(
			drawnRead(target.drawn, (id) => target.doc.layer(id)),
			pair,
		);
		const corner = pointAt(target.user.camera.get(), {
			x: box.x + box.width,
			y: box.y + box.height,
		});

		expect(behaviorFor("select").hover?.(target, corner)).toBeNull();
	});

	it("keeps the highlight on the selection over a corner handle", () => {
		const scene = groupScene(0);
		const corner = pointAt(scene.target.user.camera.get(), { x: 120, y: 100 });

		expect(behaviorFor("select").highlight?.(scene.target, corner)).toBe(scene.one);
	});
});

import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import { UserState } from "../state/userState";
import { NO_DRAWN } from "./drawn";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { NO_MODIFIERS } from "./modifiers";
import { NO_HITS, dragOver, pointAt, tapAt } from "./toolFixtures";

const BOX: LayerFields = {
	x: 0,
	y: 0,
	width: 30,
	height: 40,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};

const ON_A = { x: 110, y: 110 };
const ON_B = { x: 190, y: 110 };

interface GroupScene {
	doc: DesignDocument;
	user: UserState;
	group: LayerId;
	a: LayerId;
	b: LayerId;
}

function groupScene(): GroupScene {
	const doc = DesignDocument.create();
	const group = doc.createLayer({
		...BOX,
		x: 100,
		y: 100,
		width: 110,
		height: 40,
		geometry: { kind: "group" },
	});
	const a = doc.createLayer(BOX, group);
	const b = doc.createLayer({ ...BOX, x: 80 }, group);
	doc.commit("create group");
	return { doc, user: new UserState(), group, a, b };
}

function pressOn(scene: GroupScene, id: LayerId): PointerTarget {
	return {
		doc: scene.doc,
		user: scene.user,
		layerIds: [id, scene.group],
		layerIdsAt: () => [id, scene.group],
		drawn: NO_DRAWN,
	};
}

const select = behaviorFor("select");

describe("the select tool on a group", () => {
	it("selects the group on a click on a child", () => {
		const scene = groupScene();

		tapAt(select, pressOn(scene, scene.a), ON_A);

		expect(scene.user.selection.get()).toEqual([scene.group]);
	});

	it("selects the child on a click on it when the group is selected", () => {
		const scene = groupScene();
		scene.user.selection.set([scene.group]);

		tapAt(select, pressOn(scene, scene.a), ON_A);

		expect(scene.user.selection.get()).toEqual([scene.a]);
	});

	it("selects the child under the pointer on a double click", () => {
		const scene = groupScene();
		tapAt(select, pressOn(scene, scene.a), ON_A);

		select.doubleTap?.(
			pressOn(scene, scene.a),
			pointAt(scene.user.camera.get(), ON_A),
			NO_MODIFIERS,
		);

		expect(scene.user.selection.get()).toEqual([scene.a]);
	});

	it("edits the vertices of the child on a double click after the child is selected", () => {
		const scene = groupScene();
		scene.user.selection.set([scene.a]);

		select.doubleTap?.(
			pressOn(scene, scene.a),
			pointAt(scene.user.camera.get(), ON_A),
			NO_MODIFIERS,
		);

		expect(scene.user.pathEdit.get()).toBe(scene.a);
	});

	it("selects a sibling directly on a click after the double click", () => {
		const scene = groupScene();
		scene.user.selection.set([scene.a]);

		tapAt(select, pressOn(scene, scene.b), ON_B);

		expect(scene.user.selection.get()).toEqual([scene.b]);
	});

	it("moves the whole group on a drag from a child", () => {
		const scene = groupScene();

		dragOver(select, pressOn(scene, scene.a), { press: ON_A, release: { x: 130, y: 140 } });

		expect(scene.user.selection.get()).toEqual([scene.group]);
		expect(scene.doc.layer(scene.group)).toMatchObject({ x: 120, y: 130 });
		expect(scene.doc.layer(scene.a)).toMatchObject({ x: 0, y: 0 });
		expect(scene.doc.layer(scene.b)).toMatchObject({ x: 80, y: 0 });
	});

	it("moves only the child on a drag after the double click", () => {
		const scene = groupScene();
		scene.user.selection.set([scene.a]);

		dragOver(select, pressOn(scene, scene.a), { press: ON_A, release: { x: 110, y: 130 } });

		expect(scene.user.selection.get()).toEqual([scene.a]);
		expect(scene.doc.layer(scene.group)).toMatchObject({ x: 100, y: 100, height: 60 });
		expect(scene.doc.layer(scene.a)).toMatchObject({ x: 0, y: 20 });
	});

	it("keeps the child in the group when the drag leaves the group", () => {
		const scene = groupScene();
		scene.user.selection.set([scene.a]);
		const target = { ...pressOn(scene, scene.a), layerIdsAt: NO_HITS };

		dragOver(select, target, { press: ON_A, release: { x: 400, y: 400 } });

		expect(scene.doc.layer(scene.a)).toMatchObject({ parent: scene.group });
		expect(scene.doc.layer(scene.group)).toMatchObject({ x: 180, y: 100, width: 240, height: 330 });
	});

	it("takes the child into a frame under the pointer", () => {
		const scene = groupScene();
		const frame = scene.doc.createLayer({
			...BOX,
			x: 300,
			y: 300,
			width: 200,
			height: 200,
			geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
		});
		scene.doc.commit("create frame");
		scene.user.selection.set([scene.a]);
		const target = { ...pressOn(scene, scene.a), layerIdsAt: () => [frame] };

		dragOver(select, target, { press: ON_A, release: { x: 400, y: 400 } });

		expect(scene.doc.layer(scene.a)).toMatchObject({ parent: frame });
	});
});

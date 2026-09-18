import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import type { Layout } from "../../document/layout";
import type { Point } from "../state/camera";
import { UserState } from "../state/userState";
import { flexSlotOf } from "./layoutDrag";
import { NO_MODIFIERS } from "./modifiers";
import { cancelMove } from "./moveDrag";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { pointAt } from "./toolFixtures";

const BOX: LayerFields = {
	x: 0,
	y: 0,
	width: 300,
	height: 200,
	fill: "#ffffff",
	name: "",
	clip: true,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
};
const SQUARE: LayerFields = {
	x: 0,
	y: 0,
	width: 50,
	height: 50,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};
const ROW: Layout = { kind: "flex", direction: "row", gap: 10, padding: 10 };
const GRID: Layout = { kind: "grid", columns: 2, rows: 2, gap: 0, padding: 0 };

interface LayoutScene {
	target: PointerTarget;
	doc: DesignDocument;
	box: LayerId;
	children: LayerId[];
	setHits: (ids: readonly LayerId[]) => void;
}

function sceneWith(layout: Layout, count: number): LayoutScene {
	const doc = DesignDocument.create();
	const box = doc.createLayer(BOX);
	doc.update(box, { layout });
	const children = Array.from({ length: count }, () => doc.createLayer(SQUARE, box));
	doc.commit("build");
	const [first] = children;
	let hits: readonly LayerId[] = first === undefined ? [box] : [first, box];
	const target: PointerTarget = {
		doc,
		user: new UserState(),
		layerIds: hits,
		layerIdsAt: () => hits,
	};
	return {
		target,
		doc,
		box,
		children,
		setHits: (ids) => {
			hits = ids;
		},
	};
}

interface Steps {
	press: Point;
	moves: readonly Point[];
	end: boolean;
}

function drag(scene: LayoutScene, steps: Steps): void {
	const behavior = behaviorFor("select");
	const camera = scene.target.user.camera.get();
	const press = pointAt(camera, steps.press);
	behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
	for (const move of steps.moves) {
		behavior.drag?.(scene.target, pointAt(camera, move), NO_MODIFIERS);
	}
	const last = steps.moves.at(-1) ?? steps.press;
	if (steps.end) {
		behavior.dragEnd?.(scene.target, pointAt(camera, last), NO_MODIFIERS);
	}
}

describe("flexSlotOf", () => {
	it("counts the siblings whose center lies before the point along the direction", () => {
		const doc = DesignDocument.create();
		const box = doc.createLayer(BOX);
		doc.update(box, { layout: ROW });
		const ids = [doc.createLayer(SQUARE, box), doc.createLayer(SQUARE, box)];
		const others = ids.flatMap((id) => doc.layer(id) ?? []);
		expect(flexSlotOf("row", others, { x: 0, y: 0 })).toBe(0);
		expect(flexSlotOf("row", others, { x: 50, y: 0 })).toBe(1);
		expect(flexSlotOf("row", others, { x: 200, y: 0 })).toBe(2);
		expect(flexSlotOf("column", others, { x: 200, y: 0 })).toBe(0);
	});
});

describe("a drag inside a flex container", () => {
	it("moves the layer to the slot under the pointer and keeps its stored position", () => {
		const scene = sceneWith(ROW, 3);
		const [first] = scene.children;
		drag(scene, { press: { x: 35, y: 35 }, moves: [{ x: 100, y: 35 }], end: true });

		expect(scene.doc.childIds(scene.box)).toEqual([
			scene.children[1],
			scene.children[0],
			scene.children[2],
		]);
		expect(first === undefined ? null : scene.doc.layer(first)).toMatchObject({ x: 70, y: 10 });
		expect(first === undefined ? null : scene.doc.layer(first)?.lengths.x.value).toBe(0);
	});

	it("does not move the layer for a pointer that stays in its own slot", () => {
		const scene = sceneWith(ROW, 3);
		const before = scene.doc.changeCount();
		drag(scene, { press: { x: 35, y: 35 }, moves: [{ x: 60, y: 40 }], end: true });
		expect(scene.doc.childIds(scene.box)).toEqual(scene.children);
		expect(scene.doc.changeCount()).toBe(before);
	});

	it("moves the layer back and forth with the pointer", () => {
		const scene = sceneWith(ROW, 3);
		drag(scene, {
			press: { x: 35, y: 35 },
			moves: [
				{ x: 160, y: 35 },
				{ x: 20, y: 35 },
			],
			end: true,
		});
		expect(scene.doc.childIds(scene.box)).toEqual(scene.children);
	});

	it("puts Escape the layer back in its first slot", () => {
		const scene = sceneWith(ROW, 3);
		drag(scene, { press: { x: 35, y: 35 }, moves: [{ x: 160, y: 35 }], end: false });
		expect(scene.doc.childIds(scene.box).at(-1)).toBe(scene.children[0]);

		cancelMove(scene.doc, scene.target.user);

		expect(scene.doc.childIds(scene.box)).toEqual(scene.children);
		expect(scene.doc.layer(scene.children[0] ?? scene.box)?.lengths.x.value).toBe(0);
	});

	it("takes a layer from outside into the slot under the pointer", () => {
		const scene = sceneWith(ROW, 3);
		const outside = scene.doc.createLayer({ ...SQUARE, x: 400, y: 50 });
		scene.setHits([outside]);
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();
		const press = pointAt(camera, { x: 425, y: 75 });
		behavior.dragStart?.({ ...scene.target, layerIds: [outside] }, press, press, NO_MODIFIERS);
		scene.setHits([outside, scene.box]);
		behavior.drag?.(scene.target, pointAt(camera, { x: 100, y: 75 }), NO_MODIFIERS);
		behavior.dragEnd?.(scene.target, pointAt(camera, { x: 100, y: 75 }), NO_MODIFIERS);

		expect(scene.doc.childIds(scene.box)).toEqual([
			scene.children[0],
			scene.children[1],
			outside,
			scene.children[2],
		]);
		expect(scene.doc.layer(outside)).toMatchObject({ parent: scene.box, x: 130, y: 10 });
	});

	it("keeps a layer that leaves the container on the screen, then carries it", () => {
		const scene = sceneWith(ROW, 3);
		const second = scene.children[1];
		scene.setHits([]);
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();
		const press = pointAt(camera, { x: 95, y: 35 });
		const held = { ...scene.target, layerIds: second === undefined ? [] : [second] };
		behavior.dragStart?.(held, press, press, NO_MODIFIERS);
		expect(second === undefined ? null : scene.doc.layer(second)).toMatchObject({
			parent: null,
			x: 70,
			y: 10,
		});

		behavior.drag?.(held, pointAt(camera, { x: 395, y: 35 }), NO_MODIFIERS);
		behavior.dragEnd?.(held, pointAt(camera, { x: 395, y: 35 }), NO_MODIFIERS);

		expect(second === undefined ? null : scene.doc.layer(second)).toMatchObject({ x: 370, y: 10 });
		expect(scene.doc.childIds(scene.box)).toEqual([scene.children[0], scene.children[2]]);
		expect(scene.doc.layer(scene.children[2] ?? scene.box)).toMatchObject({ x: 70 });
	});
});

describe("a drag inside a grid container", () => {
	it("gives the layer the cell under the pointer", () => {
		const scene = sceneWith(GRID, 2);
		const [first, second] = scene.children;
		const before = scene.doc.changeCount();

		drag(scene, { press: { x: 20, y: 20 }, moves: [{ x: 200, y: 150 }], end: true });

		expect(first === undefined ? null : scene.doc.layer(first)).toMatchObject({
			x: 150,
			y: 100,
			cell: { column: 1, row: 1 },
		});
		expect(second === undefined ? null : scene.doc.layer(second)).toMatchObject({
			x: 0,
			y: 0,
			slot: { column: 0, row: 0 },
		});
		expect(scene.doc.changeCount()).toBe(before + 1);
	});

	it("puts Escape the layer back in the flow", () => {
		const scene = sceneWith(GRID, 2);
		const [first] = scene.children;
		drag(scene, { press: { x: 20, y: 20 }, moves: [{ x: 200, y: 150 }], end: false });

		cancelMove(scene.doc, scene.target.user);

		expect(first === undefined ? null : scene.doc.layer(first)).toMatchObject({
			cell: null,
			slot: { column: 0, row: 0 },
		});
	});
});

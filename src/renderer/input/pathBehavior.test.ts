import { describe, expect, it } from "vitest";
import type { Layer, LayerId, WritableGeometry } from "../../document/layer";
import type { Offset, Vertex } from "../../document/vertices";
import type { Point } from "../state/camera";
import { outOfLayer } from "./layerSpace";
import { NO_MODIFIERS } from "./modifiers";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { SQUARE, dragOver, pointAt, targetOf } from "./toolFixtures";
import { handleStroke } from "./useKeyInput";

const BOX = { x: 100, y: 100, width: 200, height: 100 };
const ARC_REACH = 0.5522847498;
const NE_CORNER = { x: 300, y: 100 };
const SE_CORNER = { x: 300, y: 200 };
const ESCAPE = { key: "Escape", shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };

interface Scene {
	target: PointerTarget;
	id: LayerId;
}

function sceneWith(geometry: WritableGeometry): Scene {
	const base = targetOf(false);
	const id = base.doc.createLayer({ ...SQUARE, ...BOX, geometry });
	base.doc.commit("draw");
	return { target: { ...base, layerIds: [id] }, id };
}

function editing(geometry: WritableGeometry): Scene {
	const scene = sceneWith(geometry);
	scene.target.user.selection.set([scene.id]);
	scene.target.user.pathEdit.set(scene.id);
	return scene;
}

function doubleTapAt(target: PointerTarget, stage: Point): boolean {
	const editingPath = target.user.pathEdit.get() !== null;
	const point = pointAt(target.user.camera.get(), stage);
	return behaviorFor("select", editingPath).doubleTap?.(target, point, NO_MODIFIERS) ?? false;
}

function verticesOf(scene: Scene): readonly Vertex[] {
	const geometry = scene.target.doc.layer(scene.id)?.geometry;
	if (geometry?.kind !== "path") {
		throw new Error("the layer is not a path");
	}
	return geometry.vertices;
}

function vertexAt(scene: Scene, index: number): Vertex {
	const vertex = verticesOf(scene)[index];
	if (vertex === undefined) {
		throw new Error(`the path has no vertex ${index}`);
	}
	return vertex;
}

function layerOf(scene: Scene): Layer {
	const layer = scene.target.doc.layer(scene.id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function pixelsOf(scene: Scene, offset: Offset): Point {
	const layer = layerOf(scene);
	return { x: offset.x * layer.width, y: offset.y * layer.height };
}

function canvasOf(scene: Scene, offset: Offset): Point {
	return outOfLayer(layerOf(scene), pixelsOf(scene, offset));
}

const PLAIN: WritableGeometry = {
	kind: "rectangle",
	cornerRadius: 0,
	cornerSmoothing: 0,
	frame: false,
};

describe("the path edit of a shape", () => {
	it("starts on a double tap on a shape and selects the shape", () => {
		const { target, id } = sceneWith({ kind: "ellipse" });

		expect(doubleTapAt(target, { x: 200, y: 150 })).toBe(true);
		expect(target.user.selection.get()).toEqual([id]);
		expect(target.user.pathEdit.get()).toBe(id);
	});

	it("does not start on a frame", () => {
		const { target } = sceneWith({ ...PLAIN, frame: true });

		expect(doubleTapAt(target, { x: 200, y: 150 })).toBe(false);
		expect(target.user.pathEdit.get()).toBeNull();
	});

	it("moves a vertex and turns the rectangle into a path in one undo step", () => {
		const scene = editing(PLAIN);
		const behavior = behaviorFor("select", true);
		dragOver(behavior, scene.target, { press: NE_CORNER, release: { x: 320, y: 90 } });

		expect(scene.target.doc.layer(scene.id)).toMatchObject({ x: 100, y: 90, width: 220 });
		expect(scene.target.doc.layer(scene.id)?.height).toBeCloseTo(110);
		expect(vertexAt(scene, 1)).toMatchObject({ x: 1, y: 0 });
		expect(vertexAt(scene, 0).y).toBeCloseTo(0.1 / 1.1);
		scene.target.doc.undo();
		expect(scene.target.doc.layer(scene.id)?.geometry).toEqual(PLAIN);
	});

	it("turns the other handle of a smooth vertex to the opposite side", () => {
		const scene = editing({ kind: "ellipse" });
		const reach = 100 * ARC_REACH;
		const press = { x: 200 + reach, y: 100 };
		dragOver(behaviorFor("select", true), scene.target, {
			press,
			release: { x: press.x, y: 130 },
		});

		const top = vertexAt(scene, 1);
		const after = pixelsOf(scene, top.after);
		const before = pixelsOf(scene, top.before);
		const turned = Math.hypot(reach, 30);
		expect(after.x).toBeCloseTo(reach, 1);
		expect(after.y).toBeCloseTo(30, 1);
		expect(before.x).toBeCloseTo((-reach / turned) * reach, 1);
		expect(before.y).toBeCloseTo((-30 / turned) * reach, 1);
	});

	it("makes a sharp vertex smooth on a double tap, and sharp again on a second double tap", () => {
		const scene = editing(PLAIN);

		expect(doubleTapAt(scene.target, NE_CORNER)).toBe(true);
		const smooth = vertexAt(scene, 1);
		const along = 200 / Math.hypot(200, 100);
		expect(pixelsOf(scene, smooth.after).x).toBeCloseTo(along * (100 / 3), 1);
		expect(pixelsOf(scene, smooth.before).x).toBeCloseTo(-along * (200 / 3), 1);

		doubleTapAt(scene.target, canvasOf(scene, smooth));
		expect(vertexAt(scene, 1)).toMatchObject({ before: { x: 0, y: 0 }, after: { x: 0, y: 0 } });
		expect(scene.target.doc.layer(scene.id)).toMatchObject(BOX);
	});

	it("keeps each vertex that did not move in its place on a turned layer", () => {
		const scene = editing(PLAIN);
		scene.target.doc.update(scene.id, { rotation: 90 });
		const start = layerOf(scene);
		const press = outOfLayer(start, { x: 200, y: 0 });
		dragOver(behaviorFor("select", true), scene.target, {
			press,
			release: { x: press.x + 30, y: press.y - 20 },
		});

		const held = canvasOf(scene, vertexAt(scene, 3));
		const place = outOfLayer(start, { x: 0, y: 100 });
		expect(held.x).toBeCloseTo(place.x, 1);
		expect(held.y).toBeCloseTo(place.y, 1);
	});

	it("keeps a tap on a vertex from a different layer", () => {
		const scene = editing(PLAIN);
		const tapped = behaviorFor("select", true).tap?.(
			{ ...scene.target, layerIds: [] },
			pointAt(scene.target.user.camera.get(), NE_CORNER),
			NO_MODIFIERS,
		);

		expect(tapped).toBe(true);
		expect(scene.target.user.pathEdit.get()).toBe(scene.id);
	});

	it("gives no resize handle while the edit is on", () => {
		const { target } = editing(PLAIN);
		const point = pointAt(target.user.camera.get(), SE_CORNER);

		expect(behaviorFor("select", true).hover?.(target, point)).toBeNull();
		expect(behaviorFor("select").hover?.(target, point)).toBe("resize-nwse");
	});

	it("stops when the selection changes, when the tool changes, and on Escape", () => {
		const { target, id } = editing(PLAIN);
		target.user.selection.set([]);
		expect(target.user.pathEdit.get()).toBeNull();

		target.user.selection.set([id]);
		target.user.pathEdit.set(id);
		target.user.tool.set("rectangle");
		expect(target.user.pathEdit.get()).toBeNull();

		target.user.tool.set("select");
		target.user.pathEdit.set(id);
		handleStroke(target.doc, target.user, ESCAPE);
		expect(target.user.pathEdit.get()).toBeNull();
	});
});

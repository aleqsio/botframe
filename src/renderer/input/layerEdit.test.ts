import { describe, expect, it } from "vitest";
import type { Layer, LayerId, WritableGeometry } from "../../document/layer";
import { IDENTITY_CAMERA } from "../state/camera";
import { layerEditOf } from "./layerEdit";
import { NO_MODIFIERS } from "./modifiers";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { SQUARE, lastDrawn, pointAt, tapAt, targetOf } from "./toolFixtures";
import { handleStroke } from "./useKeyInput";

const SPOT = { x: 40, y: 50 };
const ENTER = { key: "Enter", shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };
const FRAME: WritableGeometry = {
	kind: "rectangle",
	cornerRadius: 0,
	cornerSmoothing: 0,
	frame: true,
};

interface MaskedText {
	target: PointerTarget;
	text: LayerId;
	mask: LayerId;
}

function maskedText(geometry: WritableGeometry): MaskedText {
	const base = targetOf(false);
	tapAt(behaviorFor("text"), base, SPOT);
	const text = lastDrawn(base).id;
	base.user.textEdit.set(null);
	const mask = base.doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 200, height: 200, geometry });
	base.doc.update(text, { clipLayer: mask });
	base.doc.commit("clip to layer");
	base.user.selection.set([]);
	return { target: { ...base, layerIds: [text] }, text, mask };
}

function layerOf(target: PointerTarget, id: LayerId): Layer {
	const layer = target.doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function editOf(scene: MaskedText, edited: LayerId | null): ReturnType<typeof layerEditOf> {
	const read = (id: LayerId): Layer | null => scene.target.doc.layer(id);
	return layerEditOf(read, layerOf(scene.target, scene.text), edited);
}

function doubleClick(target: PointerTarget): boolean {
	const point = pointAt(IDENTITY_CAMERA, SPOT);
	behaviorFor("select", target.user.pathEdit.get() !== null).tap?.(target, point, NO_MODIFIERS);
	const behavior = behaviorFor("select", target.user.pathEdit.get() !== null);
	return behavior.doubleTap?.(target, point, NO_MODIFIERS) ?? false;
}

function groupedMaskedText(): MaskedText {
	const scene = maskedText({ kind: "ellipse" });
	const { doc } = scene.target;
	const group = doc.createLayer({
		...SQUARE,
		x: 0,
		y: 0,
		width: 200,
		height: 200,
		geometry: { kind: "group" },
	});
	doc.move(scene.mask, group);
	doc.move(scene.text, group);
	doc.commit("group");
	scene.target.user.selection.set([group]);
	return { ...scene, target: { ...scene.target, layerIds: [scene.text, group] } };
}

describe("the edit that a clipped layer starts", () => {
	it("is the path edit of its mask when the mask has vertices", () => {
		const scene = maskedText({ kind: "ellipse" });

		expect(editOf(scene, null)).toEqual({ mode: "path", id: scene.mask });
	});

	it("is its own edit while the path edit of its mask is on", () => {
		const scene = maskedText({ kind: "ellipse" });

		expect(editOf(scene, scene.mask)).toEqual({ mode: "text", id: scene.text });
	});

	it("is its own edit when the mask is a frame", () => {
		const scene = maskedText(FRAME);

		expect(editOf(scene, null)).toEqual({ mode: "text", id: scene.text });
	});

	it("starts the path edit of the mask on a double click, and the text edit on a second", () => {
		const scene = maskedText({ kind: "ellipse" });

		expect(doubleClick(scene.target)).toBe(true);
		expect(scene.target.user.selection.get()).toEqual([scene.mask]);
		expect(scene.target.user.pathEdit.get()).toBe(scene.mask);
		expect(scene.target.user.textEdit.get()).toBeNull();

		expect(doubleClick(scene.target)).toBe(true);
		expect(scene.target.user.pathEdit.get()).toBeNull();
		expect(scene.target.user.textEdit.get()).toEqual({ id: scene.text, message: "edit text" });
	});

	it("starts the path edit of the mask on Enter", () => {
		const scene = maskedText({ kind: "ellipse" });
		scene.target.user.selection.set([scene.text]);

		expect(handleStroke(scene.target.doc, scene.target.user, ENTER)).toBe(true);
		expect(scene.target.user.pathEdit.get()).toBe(scene.mask);
		expect(scene.target.user.textEdit.get()).toBeNull();
	});

	it("selects the clipped text in a selected group on a click, then edits the mask and the text", () => {
		const scene = groupedMaskedText();
		const point = pointAt(IDENTITY_CAMERA, SPOT);

		behaviorFor("select").tap?.(scene.target, point, NO_MODIFIERS);
		expect(scene.target.user.selection.get()).toEqual([scene.text]);

		expect(doubleClick(scene.target)).toBe(true);
		expect(scene.target.user.pathEdit.get()).toBe(scene.mask);

		expect(doubleClick(scene.target)).toBe(true);
		expect(scene.target.user.textEdit.get()).toEqual({ id: scene.text, message: "edit text" });
	});
});

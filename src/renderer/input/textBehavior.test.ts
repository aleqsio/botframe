import { describe, expect, it } from "vitest";
import type { LayerId } from "../../document/layer";
import { IDENTITY_CAMERA } from "../state/camera";
import { NO_MODIFIERS as NO_KEYS } from "./modifiers";
import { behaviorFor } from "./toolBehavior";
import { dragOver, firstId, lastDrawn, pointAt, tapAt, targetOf } from "./toolFixtures";
import { editedText, editorText, endTextEdit, typeText } from "./textEdit";
import { handleStroke } from "./useKeyInput";

const EMPTY_SPOT = { x: 40, y: 50 };
const DRAG = { press: { x: 40, y: 50 }, release: { x: 240, y: 90 } };
const ENTER = { key: "Enter", shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };

function lastPoint(): ReturnType<typeof pointAt> {
	return pointAt(IDENTITY_CAMERA, EMPTY_SPOT);
}

function placedText(): { target: ReturnType<typeof targetOf>; id: LayerId } {
	const target = targetOf(false);
	tapAt(behaviorFor("text"), target, EMPTY_SPOT);
	return { target, id: lastDrawn(target).id };
}

describe("the text tool", () => {
	it("places a text layer that hugs its text, and starts to edit it", () => {
		const target = targetOf(false);

		tapAt(behaviorFor("text"), target, EMPTY_SPOT);
		const layer = lastDrawn(target);

		expect(layer).toMatchObject({ x: 40, y: 50, geometry: { kind: "text", content: "" } });
		expect(layer.layout).toMatchObject({ width: "hug", height: "hug" });
		expect(target.user.tool.get()).toBe("select");
		expect(target.user.textEdit.get()).toEqual({ id: layer.id, message: "create text" });
	});

	it("gives a dragged text layer the width of the drag, and lets the height hug the text", () => {
		const target = targetOf(false);

		dragOver(behaviorFor("text"), target, DRAG);
		const layer = lastDrawn(target);

		expect(layer).toMatchObject({ x: 40, y: 50, width: 200 });
		expect(layer.layout).toMatchObject({ width: "fixed", height: "hug" });
		expect(target.user.textEdit.get()?.id).toBe(layer.id);
	});

	it("keeps the typed text in one commit when the edit ends", () => {
		const { target, id } = placedText();
		const changes = target.doc.changeCount();

		typeText(target.doc, id, "H");
		typeText(target.doc, id, "Hi");
		endTextEdit(target.doc, target.user);

		expect(target.doc.layer(id)?.geometry).toMatchObject({ content: "Hi" });
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.textEdit.get()).toBeNull();
		expect(target.user.selection.get()).toEqual([id]);
	});

	it("removes a text layer that has no text when the edit ends", () => {
		const { target, id } = placedText();

		typeText(target.doc, id, "  ");
		endTextEdit(target.doc, target.user);

		expect(target.doc.layer(id)).toBeNull();
		expect(target.user.selection.get()).toEqual([]);
	});
});

describe("the start of a text edit", () => {
	it("starts on a double tap on a text layer with the select tool", () => {
		const { target, id } = placedText();
		typeText(target.doc, id, "Hi");
		endTextEdit(target.doc, target.user);

		behaviorFor("select").doubleTap?.({ ...target, layerIds: [id] }, lastPoint(), NO_KEYS);

		expect(target.user.textEdit.get()).toEqual({ id, message: "edit text" });
	});

	it("does not start on a double tap on a layer that is not text", () => {
		const target = targetOf(true);

		behaviorFor("select").doubleTap?.(target, lastPoint(), NO_KEYS);

		expect(target.user.textEdit.get()).toBeNull();
		expect(target.user.pathEdit.get()).toBe(firstId(target.doc));
	});

	it("starts on Enter when one text layer is selected", () => {
		const { target, id } = placedText();
		typeText(target.doc, id, "Hi");
		endTextEdit(target.doc, target.user);

		expect(handleStroke(target.doc, target.user, ENTER)).toBe(true);
		expect(target.user.textEdit.get()?.id).toBe(id);
	});
});

describe("the text in the editor", () => {
	it("adds a line under a last line break, so the caret can go to it, and removes it again", () => {
		expect(editorText("one\n")).toBe("one\n\n");
		expect(editedText(editorText("one\n"))).toBe("one\n");
		expect(editedText(editorText("one"))).toBe("one");
	});
});

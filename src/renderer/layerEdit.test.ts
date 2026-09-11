import { describe, expect, it } from "vitest";
import { DesignDocument } from "../document/document";
import { DRAWN, firstId } from "../document/documentFixtures";
import type { LayerId } from "../document/layer";
import { deleteSelection, duplicateSelection } from "./layerEdit";
import { PASTE_OFFSET } from "./paste";
import { UserState } from "./state/userState";

function only(ids: readonly LayerId[]): LayerId {
	const [id] = ids;
	if (id === undefined) {
		throw new Error("the list holds no layer");
	}
	return id;
}

function withChild(): { doc: DesignDocument; parent: LayerId; child: LayerId } {
	const doc = DesignDocument.create();
	const parent = doc.createLayer(DRAWN);
	const child = doc.createLayer({ ...DRAWN, name: "Inside" }, parent);
	doc.commit("create artboard");
	return { doc, parent, child };
}

describe("deleteSelection", () => {
	it("takes each selected layer away and commits one step", () => {
		const { doc, parent, child } = withChild();
		const user = new UserState();
		const seed = firstId(doc);
		user.selection.set([seed, parent]);

		expect(deleteSelection(doc, user)).toBe(true);
		expect(doc.layer(seed)).toBeNull();
		expect(doc.layer(parent)).toBeNull();
		expect(doc.layer(child)).toBeNull();
		expect(doc.rootIds()).toEqual([]);

		doc.undo();

		expect(doc.rootIds()).toHaveLength(2);
	});

	it("does nothing with an empty selection", () => {
		const doc = DesignDocument.create();

		expect(deleteSelection(doc, new UserState())).toBe(false);
		expect(doc.rootIds()).toHaveLength(1);
	});
});

describe("duplicateSelection", () => {
	it("copies the subtree into the parent of the source and selects the copy", () => {
		const { doc, parent, child } = withChild();
		const user = new UserState();
		user.selection.set([parent]);

		expect(duplicateSelection(doc, user)).toBe(true);

		const copy = only(user.selection.get());
		expect(copy).not.toBe(parent);
		expect(doc.rootIds()).toHaveLength(3);
		expect(doc.layer(copy)).toMatchObject({
			x: DRAWN.x + PASTE_OFFSET,
			y: DRAWN.y + PASTE_OFFSET,
			parent: null,
		});

		const copiedChild = only(doc.childIds(copy));
		expect(copiedChild).not.toBe(child);
		expect(doc.layer(copiedChild)).toMatchObject({ name: "Inside", x: DRAWN.x });
	});

	it("keeps the copy beside the source inside its parent", () => {
		const { doc, parent, child } = withChild();
		const user = new UserState();
		user.selection.set([child]);

		expect(duplicateSelection(doc, user)).toBe(true);
		expect(doc.childIds(parent)).toHaveLength(2);
		expect(doc.layer(only(user.selection.get()))).toMatchObject({ parent });
	});

	it("does nothing with an empty selection", () => {
		const doc = DesignDocument.create();
		const user = new UserState();

		expect(duplicateSelection(doc, user)).toBe(false);
		expect(doc.rootIds()).toHaveLength(1);
		expect(user.selection.get()).toEqual([]);
	});
});

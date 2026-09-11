import { describe, expect, it } from "vitest";
import { DesignDocument } from "../document/document";
import { firstId } from "../document/documentFixtures";
import type { EditMenuItem } from "../shared/editMenu";
import { contextMenuItems, editMenuItems } from "./editMenu";
import { UserState } from "./state/userState";

function labelsOf(items: readonly EditMenuItem[]): string[] {
	return items.map((item) => item.label);
}

function enabledOf(items: readonly EditMenuItem[]): Record<string, boolean> {
	return Object.fromEntries(items.map((item) => [item.label, item.enabled]));
}

function named(items: readonly EditMenuItem[], label: string): EditMenuItem {
	const item = items.find((entry) => entry.label === label);
	if (item === undefined) {
		throw new Error(`the menu holds no item named ${label}`);
	}
	return item;
}

function withSeparator(items: readonly EditMenuItem[]): string[] {
	return items.filter((item) => item.separatorBefore === true).map((item) => item.label);
}

describe("the Edit menu", () => {
	it("lists the commands in order and gives Copy as a submenu", () => {
		const items = editMenuItems(DesignDocument.create(), new UserState());

		expect(labelsOf(items)).toEqual(["Undo", "Redo", "Cut", "Copy", "Copy as", "Paste"]);
		expect(labelsOf(named(items, "Copy as").submenu ?? [])).toEqual(["HTML"]);
		expect(withSeparator(items)).toEqual(["Cut"]);
	});

	it("disables each command on a new document with no selection", () => {
		const items = editMenuItems(DesignDocument.create(), new UserState());

		expect(enabledOf(items)).toEqual({
			Undo: false,
			Redo: false,
			Cut: false,
			Copy: false,
			"Copy as": false,
			Paste: false,
		});
	});

	it("enables cut, copy and copy as when the selection holds a layer", () => {
		const doc = DesignDocument.create();
		const user = new UserState();
		user.selection.set([firstId(doc)]);

		expect(enabledOf(editMenuItems(doc, user))).toMatchObject({
			Cut: true,
			Copy: true,
			"Copy as": true,
			Paste: false,
		});
	});

	it("enables paste only when the clipboard holds layers", () => {
		const doc = DesignDocument.create();
		const user = new UserState();
		user.pasteReady.set(true);

		expect(enabledOf(editMenuItems(doc, user))).toMatchObject({ Paste: true, Copy: false });
	});

	it("enables undo after the first commit", () => {
		const doc = DesignDocument.create();
		doc.update(firstId(doc), { x: 10 });
		doc.commit("move layer");

		expect(enabledOf(editMenuItems(doc, new UserState()))).toMatchObject({
			Undo: true,
			Redo: false,
		});
	});
});

describe("the context menu", () => {
	it("lists the clipboard commands, gives Copy as a submenu, and holds no separator", () => {
		const items = contextMenuItems(DesignDocument.create(), new UserState());

		expect(labelsOf(items)).toEqual(["Cut", "Copy", "Copy as", "Paste"]);
		expect(labelsOf(named(items, "Copy as").submenu ?? [])).toEqual(["HTML"]);
		expect(withSeparator(items)).toEqual([]);
	});

	it("disables each command with no selection and an empty clipboard", () => {
		const items = contextMenuItems(DesignDocument.create(), new UserState());

		expect(enabledOf(items)).toEqual({
			Cut: false,
			Copy: false,
			"Copy as": false,
			Paste: false,
		});
	});

	it("follows the selection and the flag of the clipboard", () => {
		const doc = DesignDocument.create();
		const user = new UserState();
		user.selection.set([firstId(doc)]);
		user.pasteReady.set(true);

		expect(enabledOf(contextMenuItems(doc, user))).toEqual({
			Cut: true,
			Copy: true,
			"Copy as": true,
			Paste: true,
		});
	});
});

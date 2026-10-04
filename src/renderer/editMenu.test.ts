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

		expect(labelsOf(items)).toEqual([
			"Undo",
			"Redo",
			"Cut",
			"Copy",
			"Copy as",
			"Paste",
			"Duplicate",
			"Group",
			"Ungroup",
			"Delete",
			"Arrange",
		]);
		expect(labelsOf(named(items, "Copy as").submenu ?? [])).toEqual(["HTML"]);
		expect(withSeparator(items)).toEqual(["Cut", "Duplicate", "Arrange"]);
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
			Duplicate: false,
			Group: false,
			Ungroup: false,
			Delete: false,
			Arrange: false,
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
			Duplicate: true,
			Group: true,
			Ungroup: false,
			Delete: true,
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
	it("lists the clipboard and layer commands and separates the two groups", () => {
		const items = contextMenuItems(DesignDocument.create(), new UserState());

		expect(labelsOf(items)).toEqual([
			"Cut",
			"Copy",
			"Copy as",
			"Paste",
			"Duplicate",
			"Group",
			"Ungroup",
			"Delete",
			"Arrange",
		]);
		expect(labelsOf(named(items, "Copy as").submenu ?? [])).toEqual(["HTML"]);
		expect(withSeparator(items)).toEqual(["Duplicate", "Arrange"]);
	});

	it("disables each command with no selection and an empty clipboard", () => {
		const items = contextMenuItems(DesignDocument.create(), new UserState());

		expect(enabledOf(items)).toEqual({
			Cut: false,
			Copy: false,
			"Copy as": false,
			Paste: false,
			Duplicate: false,
			Group: false,
			Ungroup: false,
			Delete: false,
			Arrange: false,
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
			Duplicate: true,
			Group: true,
			Ungroup: false,
			Delete: true,
			Arrange: true,
		});
	});

	it("gives Arrange a submenu of the layout actions, grouped by a separator", () => {
		const doc = DesignDocument.create();
		const user = new UserState();
		user.selection.set([firstId(doc)]);
		const arrange = named(contextMenuItems(doc, user), "Arrange").submenu ?? [];

		expect(labelsOf(arrange)).toContain("Align left");
		expect(labelsOf(arrange)).toContain("Swap width and height");
		expect(withSeparator(arrange)).toEqual([
			"Distribute horizontally",
			"Center horizontally in the parent",
			"Flip horizontally",
		]);
		expect(enabledOf(arrange)).toMatchObject({
			"Align left": false,
			"Swap width and height": true,
			"Rotate 90° right": true,
		});
	});
});

import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import { DRAWN, firstId } from "../../document/documentFixtures";
import { UserState } from "../state/userState";
import { EDIT_COMMANDS, commandById, commandForStroke, runEditCommand } from "./editCommand";
import type { EditCommand } from "./editCommand";
import type { KeyStroke } from "./layerCommand";

const PLAIN = { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };

function stroke(key: string, held: Partial<KeyStroke> = {}): KeyStroke {
	return { key, ...PLAIN, ...held };
}

function commandOf(id: string): EditCommand {
	const command = commandById(id);
	if (command === null) {
		throw new Error(`no edit command with the id ${id}`);
	}
	return command;
}

function movedDocument(): DesignDocument {
	const doc = DesignDocument.create();
	doc.update(firstId(doc), { x: 999, y: 999 });
	doc.commit("move layer");
	return doc;
}

describe("commandForStroke", () => {
	it("reads undo from Cmd+Z and from Ctrl+Z", () => {
		expect(commandForStroke(stroke("z", { metaKey: true }))?.id).toBe("undo");
		expect(commandForStroke(stroke("z", { ctrlKey: true }))?.id).toBe("undo");
		expect(commandForStroke(stroke("Z", { metaKey: true }))?.id).toBe("undo");
	});

	it("reads redo from Cmd+Shift+Z and from Ctrl+Y", () => {
		expect(commandForStroke(stroke("z", { metaKey: true, shiftKey: true }))?.id).toBe("redo");
		expect(commandForStroke(stroke("y", { ctrlKey: true }))?.id).toBe("redo");
		expect(commandForStroke(stroke("z", { ctrlKey: true, shiftKey: true }))?.id).toBe("redo");
	});

	it("reads no command from a key that holds no accelerator", () => {
		expect(commandForStroke(stroke("z"))).toBeNull();
		expect(commandForStroke(stroke("y"))).toBeNull();
		expect(commandForStroke(stroke("z", { ctrlKey: true, altKey: true }))).toBeNull();
	});

	it("reads delete from the Delete key and from the Backspace key", () => {
		expect(commandForStroke(stroke("Delete"))?.id).toBe("delete");
		expect(commandForStroke(stroke("Backspace"))?.id).toBe("delete");
		expect(commandForStroke(stroke("Delete", { shiftKey: true }))?.id).toBe("delete");
	});

	it("reads no delete from a Delete key that holds an accelerator", () => {
		expect(commandForStroke(stroke("Delete", { metaKey: true }))).toBeNull();
		expect(commandForStroke(stroke("Backspace", { ctrlKey: true }))).toBeNull();
		expect(commandForStroke(stroke("Backspace", { altKey: true }))).toBeNull();
	});

	it("reads duplicate from Cmd+D and from Ctrl+D", () => {
		expect(commandForStroke(stroke("d", { metaKey: true }))?.id).toBe("duplicate");
		expect(commandForStroke(stroke("d", { ctrlKey: true }))?.id).toBe("duplicate");
		expect(commandForStroke(stroke("d"))).toBeNull();
	});
});

describe("commandById", () => {
	it("gives the command of a known id", () => {
		expect(commandById("undo")?.label).toBe("Undo");
		expect(commandById("redo")?.label).toBe("Redo");
	});

	it("gives the command of each clipboard id", () => {
		expect(commandById("cut")?.label).toBe("Cut");
		expect(commandById("copy")?.label).toBe("Copy");
		expect(commandById("paste")?.label).toBe("Paste");
	});

	it("gives the command of each layer id", () => {
		expect(commandById("duplicate")?.label).toBe("Duplicate");
		expect(commandById("delete")?.label).toBe("Delete");
	});

	it("gives null for a name that no command has", () => {
		expect(commandById("sabotage")).toBeNull();
		expect(commandById("copyAs")).toBeNull();
		expect(commandById("")).toBeNull();
	});

	it("gives a label for each command, and an accelerator for each one but a format", () => {
		for (const command of EDIT_COMMANDS) {
			expect(command.label.length).toBeGreaterThan(0);
			expect(command.accelerator.length).toBeGreaterThan(command.isFormat === true ? -1 : 0);
		}
	});
});

describe("runEditCommand", () => {
	it("undoes and redoes the last commit", () => {
		const doc = movedDocument();
		const user = new UserState();
		const id = firstId(doc);

		expect(runEditCommand(commandOf("undo"), doc, user)).toBe(true);
		expect(doc.layer(id)).toMatchObject({ x: 420, y: 260 });

		expect(runEditCommand(commandOf("redo"), doc, user)).toBe(true);
		expect(doc.layer(id)).toMatchObject({ x: 999, y: 999 });
	});

	it("refuses to undo in the middle of a drag", () => {
		const doc = movedDocument();
		const user = new UserState();
		user.dragging.set(true);

		expect(runEditCommand(commandOf("undo"), doc, user)).toBe(false);
		expect(doc.layer(firstId(doc))).toMatchObject({ x: 999, y: 999 });
	});

	it("refuses to undo in the middle of a draw", () => {
		const doc = movedDocument();
		const user = new UserState();
		user.draw.set({ id: firstId(doc), origin: { x: 0, y: 0 } });

		expect(runEditCommand(commandOf("undo"), doc, user)).toBe(false);
		expect(doc.layer(firstId(doc))).toMatchObject({ x: 999, y: 999 });
	});

	it("drops the layer of an undone create from the selection and closes the layer menu", () => {
		const doc = DesignDocument.create();
		const user = new UserState();
		const seed = firstId(doc);
		const drawn = doc.createLayer(DRAWN);
		doc.commit("create artboard");
		user.selection.set([seed, drawn]);
		user.menu.set({ client: { x: 1, y: 2 }, layerIds: [drawn] });

		runEditCommand(commandOf("undo"), doc, user);

		expect(doc.layer(drawn)).toBeNull();
		expect(user.selection.get()).toEqual([seed]);
		expect(user.menu.get()).toBeNull();
	});

	it("deletes the selected layers and empties the selection", () => {
		const doc = DesignDocument.create();
		const user = new UserState();
		const id = firstId(doc);
		user.selection.set([id]);

		expect(runEditCommand(commandOf("delete"), doc, user)).toBe(true);
		expect(doc.layer(id)).toBeNull();
		expect(user.selection.get()).toEqual([]);
	});

	it("refuses to delete in the middle of a drag", () => {
		const doc = DesignDocument.create();
		const user = new UserState();
		const id = firstId(doc);
		user.selection.set([id]);
		user.dragging.set(true);

		expect(runEditCommand(commandOf("delete"), doc, user)).toBe(false);
		expect(doc.layer(id)).not.toBeNull();
	});

	it("refuses to delete in the middle of a row drag", () => {
		const doc = DesignDocument.create();
		const user = new UserState();
		const id = firstId(doc);
		user.selection.set([id]);
		user.rowDrag.set({ id, target: null });

		expect(runEditCommand(commandOf("delete"), doc, user)).toBe(false);
		expect(doc.layer(id)).not.toBeNull();
	});

	it("duplicates the selection and selects the copy", () => {
		const doc = DesignDocument.create();
		const user = new UserState();
		const id = firstId(doc);
		user.selection.set([id]);

		expect(runEditCommand(commandOf("duplicate"), doc, user)).toBe(true);
		expect(doc.rootIds()).toHaveLength(2);
		expect(user.selection.get()).not.toEqual([id]);
		expect(user.selection.get()).toHaveLength(1);
	});

	it("keeps the selection that the undo leaves alive", () => {
		const doc = movedDocument();
		const user = new UserState();
		const selection = [firstId(doc)];
		user.selection.set(selection);

		runEditCommand(commandOf("undo"), doc, user);

		expect(user.selection.get()).toBe(selection);
	});
});

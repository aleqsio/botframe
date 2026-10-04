import { describe, expect, it } from "vitest";
import { DRAWN } from "../../document/documentFixtures";
import { fileBytes, readFile } from "../../document/file";
import { Tab } from "./tab";
import { Workspace } from "./workspace";

const POSTER = { token: "poster", name: "Poster" };

interface ThreeTabs {
	workspace: Workspace;
	first: Tab;
	second: Tab;
	third: Tab;
}

function threeTabs(): ThreeTabs {
	const first = Tab.untitled();
	const second = Tab.untitled();
	const third = Tab.untitled();
	const workspace = new Workspace(first);
	workspace.add(second);
	workspace.add(third);
	return { workspace, first, second, third };
}

describe("the workspace", () => {
	it("starts with one tab that is active", () => {
		const first = Tab.untitled();
		const workspace = new Workspace(first);

		expect(workspace.tabs.get()).toEqual([first]);
		expect(workspace.active.get()).toBe(first);
	});

	it("makes an added tab the active tab, at the end", () => {
		const { workspace, first, second, third } = threeTabs();

		expect(workspace.tabs.get()).toEqual([first, second, third]);
		expect(workspace.active.get()).toBe(third);
	});

	it("makes the next tab active when the active tab closes", () => {
		const { workspace, first, second, third } = threeTabs();
		workspace.active.set(second);

		workspace.close(second);

		expect(workspace.tabs.get()).toEqual([first, third]);
		expect(workspace.active.get()).toBe(third);
	});

	it("makes the tab before it active when the last tab in the row closes", () => {
		const { workspace, second, third } = threeTabs();

		workspace.close(third);

		expect(workspace.active.get()).toBe(second);
	});

	it("keeps the active tab when a different tab closes", () => {
		const { workspace, first, second, third } = threeTabs();

		workspace.close(first);

		expect(workspace.tabs.get()).toEqual([second, third]);
		expect(workspace.active.get()).toBe(third);
	});

	it("puts a new Untitled tab in place of the only tab when it closes", () => {
		const first = Tab.untitled();
		const workspace = new Workspace(first);

		workspace.close(first);

		const [only] = workspace.tabs.get();
		expect(workspace.tabs.get()).toHaveLength(1);
		expect(only).not.toBe(first);
		expect(workspace.active.get()).toBe(only);
	});
});

describe("a tab", () => {
	it("has no changes when it starts", () => {
		expect(Tab.untitled().hasChanges()).toBe(false);
	});

	it("has changes after an edit, and none after a save", () => {
		const tab = Tab.untitled();
		tab.doc.createLayer(DRAWN);
		tab.doc.commit("create frame");

		expect(tab.hasChanges()).toBe(true);

		tab.markSaved(POSTER, tab.doc.version());

		expect(tab.hasChanges()).toBe(false);
		expect(tab.name.get()).toBe("Poster");
	});

	it("keeps an edit made during a save as a change", () => {
		const tab = Tab.untitled();
		const version = tab.doc.version();
		tab.doc.createLayer(DRAWN);
		tab.doc.commit("create frame");

		tab.markSaved(POSTER, version);

		expect(tab.hasChanges()).toBe(true);
	});

	it("becomes an Untitled tab with changes when a different tab takes its file", () => {
		const tab = Tab.untitled();
		tab.markSaved(POSTER, tab.doc.version());

		tab.loseFile();

		expect(tab.name.get()).toBe("Untitled");
		expect(tab.token.get()).toBeNull();
		expect(tab.hasChanges()).toBe(true);
	});

	it("is Untitled before a save", () => {
		expect(Tab.untitled().name.get()).toBe("Untitled");
	});

	it("keeps its saved state through the bytes of its document", () => {
		const tab = Tab.untitled();
		tab.markSaved(POSTER, tab.doc.version());
		const doc = readFile(fileBytes(tab.doc));
		if (doc === null) {
			throw new Error("the bytes are not a document");
		}

		const restored = new Tab(doc, POSTER, tab.savedVersion.get());

		expect(restored.hasChanges()).toBe(false);
		restored.doc.createLayer(DRAWN);
		restored.doc.commit("create frame");
		expect(restored.hasChanges()).toBe(true);
	});
});

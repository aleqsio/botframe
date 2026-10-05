import { afterEach, describe, expect, it, vi } from "vitest";
import type { DesignDocument } from "../document/document";
import { fileBytes, readFile } from "../document/file";
import type { LayerId } from "../document/layer";
import { ensureFont } from "./fonts/fontLoad";
import { welcomeTab } from "./welcome";

function rootOf(doc: DesignDocument): LayerId {
	const [id] = doc.rootIds();
	if (id === undefined) {
		throw new Error("no layer");
	}
	return id;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("welcomeTab", () => {
	it("opens the bundled welcome file with its boards, fonts, and components", async () => {
		const tab = await welcomeTab();
		const { doc } = tab;
		const root = rootOf(doc);
		expect(tab.name.get()).toBe("Welcome");
		expect(tab.hasChanges()).toBe(false);
		expect(doc.layer(root)).toMatchObject({ name: "Welcome tour" });
		expect(doc.childIds(root)).toHaveLength(7);
		expect(doc.fonts.faces().map((face) => face.family)).toEqual(
			expect.arrayContaining(["Bricolage Grotesque", "Caveat", "JetBrains Mono"]),
		);
		expect(doc.components.entries().map((entry) => entry.name)).toEqual(
			expect.arrayContaining(["Pill", "Keycap"]),
		);
	});

	it("holds each font that its text uses, so the editor adds none and the tab stays saved", async () => {
		vi.stubGlobal("fetch", () => Promise.reject(new Error("no network")));
		const tab = await welcomeTab();
		const { doc } = tab;
		const fonts = doc
			.layerIds()
			.map((id) => doc.layer(id)?.geometry)
			.filter((geometry) => geometry?.kind === "text");
		const loaded = await Promise.all(
			fonts.map(({ fontFamily: family, italic, fontWeight: weight }) =>
				ensureFont(doc, { family, italic, weight }),
			),
		);
		expect(loaded.every(Boolean)).toBe(true);
		expect(tab.hasChanges()).toBe(false);
	});

	it("keeps an edit through undo, save, and open", async () => {
		const { doc } = await welcomeTab();
		const root = rootOf(doc);
		doc.update(root, { name: "Mine" });
		doc.commit("rename");
		expect(doc.undo()).toBe(true);
		expect(doc.redo()).toBe(true);
		const reopened = readFile(fileBytes(doc));
		expect(reopened?.layer(root)).toMatchObject({ name: "Mine" });
		expect(reopened?.changeCount()).toBeGreaterThan(0);
	});
});

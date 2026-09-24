import { describe, expect, it } from "vitest";
import type { ComponentSource } from "../document/component";
import { DesignDocument } from "../document/document";
import { componentId, importFolder, verifiedSources } from "./componentImport";

const TAG: ComponentSource = { name: "Tag", html: "<b>{{label}}</b>", css: "", props: [] };

function fileAt(path: string, text: string): File {
	const file = new File([text], path.split("/").at(-1) ?? path);
	Object.defineProperty(file, "webkitRelativePath", { value: path });
	return file;
}

describe("componentId", () => {
	it("gives the same address for the same source and a different address for a change", async () => {
		expect(await componentId(TAG)).toBe(await componentId({ ...TAG }));
		expect(await componentId(TAG)).not.toBe(await componentId({ ...TAG, css: "b{}" }));
		expect(await componentId(TAG)).toMatch(/^[\da-f]{64}$/u);
	});
});

describe("importFolder", () => {
	it("stores each component out of the undo history and reports each component that it skipped", async () => {
		const doc = DesignDocument.create();
		const report = await importFolder(doc, [
			fileAt("kit/Tag.html", TAG.html),
			fileAt("kit/Open.html", "{{#open}}"),
			fileAt("kit/logo.png", "not text"),
		]);

		expect(report).toEqual([
			"Imported 1 component.",
			"Skipped Open. Its HTML file has a section that is not closed.",
		]);
		expect(doc.components.catalog()).toEqual([{ name: "Tag", id: await componentId(TAG) }]);
		expect(doc.canUndo()).toBe(false);
	});

	it("reports a folder with no component", async () => {
		const doc = DesignDocument.create();

		expect(await importFolder(doc, [fileAt("notes.txt", "")])).toEqual(["Imported 0 components."]);
		expect(doc.components.catalog()).toEqual([]);
	});
});

describe("verifiedSources", () => {
	it("keeps a pasted source only when its address is the hash of the source", async () => {
		const address = await componentId(TAG);
		const changed = { ...TAG, html: "<i>{{label}}</i>" };

		expect(await verifiedSources({ [address]: TAG, forged: changed })).toEqual({ [address]: TAG });
	});
});

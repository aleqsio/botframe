import { expect, test } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DesignDocument } from "../src/document/document";
import { fileBytes } from "../src/document/file";
import { drawWith, openStage } from "./support";

const FRAME = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };

async function savedPath(): Promise<string> {
	return join(await mkdtemp(join(tmpdir(), "botframe-")), "Poster");
}

async function writtenFile(): Promise<string> {
	const path = await savedPath();
	await writeFile(`${path}.botframe`, fileBytes(DesignDocument.create()));
	return path;
}

function answerDialogs(app: ElectronApplication, path: string): Promise<void> {
	return app.evaluate(({ dialog }, file) => {
		dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath: file });
		dialog.showOpenDialog = () =>
			Promise.resolve({ canceled: false, filePaths: [`${file}.botframe`] });
	}, path);
}

async function pickFileItem(window: Page, label: string): Promise<void> {
	await window.locator("#file-bar").getByRole("button", { name: "File" }).click();
	await window.getByRole("menu", { name: "File" }).getByRole("menuitem", { name: label }).click();
}

test("Save As writes a .botframe file and names the tab after it", async () => {
	const { app, layers, origin, window } = await openStage();
	const path = await savedPath();
	await answerDialogs(app, path);

	await drawWith(window, origin, "r", FRAME);
	await expect(layers).toHaveCount(2);
	await pickFileItem(window, "Save As…");

	await expect(window.getByRole("tab", { selected: true })).toHaveText("Poster");
	await expect(window.locator("#file-bar .file-name")).toHaveText("Poster");
	const bytes = await readFile(`${path}.botframe`);
	expect(bytes.subarray(0, 8).toString()).toBe("botframe");

	await app.close();
});

test("Open shows the file in a new tab, and a second Open of it selects that tab", async () => {
	const { app, layers, origin, window } = await openStage();
	const path = await writtenFile();
	await answerDialogs(app, path);
	await drawWith(window, origin, "r", FRAME);
	await expect(layers).toHaveCount(2);

	await pickFileItem(window, "Open…");

	await expect(window.getByRole("tab")).toHaveText(["Untitled", "Poster"]);
	await expect(window.getByRole("tab", { selected: true })).toHaveText("Poster");
	await expect(layers).toHaveCount(1);

	await window.getByRole("tab", { name: "Untitled" }).click();
	await expect(layers).toHaveCount(2);

	await pickFileItem(window, "Open…");
	await expect(window.getByRole("tab", { selected: true })).toHaveText("Poster");
	await expect(window.getByRole("tab")).toHaveCount(2);
	expect(app.windows()).toHaveLength(1);

	await app.close();
});

test("New Tab and Close Tab in the File menu add a tab and take it away", async () => {
	const { app, window } = await openStage();

	await pickFileItem(window, "New Tab");
	await expect(window.getByRole("tab")).toHaveCount(2);

	await pickFileItem(window, "Close Tab");
	await expect(window.getByRole("tab")).toHaveCount(1);

	await app.close();
});

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

test("Save writes a .botframe file and shows its name in the file pill", async () => {
	const { app, layers, origin, window } = await openStage();
	const path = await savedPath();
	await answerDialogs(app, path);

	await drawWith(window, origin, "r", FRAME);
	await expect(layers).toHaveCount(2);
	await pickFileItem(window, "Save As…");

	await expect(window.locator("#file-bar .file-name")).toHaveText("Poster");
	const bytes = await readFile(`${path}.botframe`);
	expect(bytes.subarray(0, 8).toString()).toBe("botframe");

	await app.close();
});

test("Open shows the file in place of an unchanged Untitled window", async () => {
	const { app, window } = await openStage();
	const path = await writtenFile();
	await answerDialogs(app, path);

	await pickFileItem(window, "Open…");

	await expect(window.locator("#file-bar .file-name")).toHaveText("Poster");
	await expect(window.locator(".layer")).toHaveCount(1);
	expect(app.windows()).toHaveLength(1);

	await app.close();
});

test("Open puts the file in a new window when the current document has changes", async () => {
	const { app, layers, origin, window } = await openStage();
	const path = await writtenFile();
	await answerDialogs(app, path);
	await drawWith(window, origin, "r", FRAME);
	await expect(layers).toHaveCount(2);

	const opened = app.waitForEvent("window");
	await pickFileItem(window, "Open…");
	const next = await opened;

	await expect(next.locator("#file-bar .file-name")).toHaveText("Poster");
	await expect(next.locator(".layer")).toHaveCount(1);
	await expect(window.locator("#file-bar .file-name")).toHaveText("Untitled");
	await expect(layers).toHaveCount(2);

	await app.close();
});

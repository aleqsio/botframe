import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { LAYERS_FLAVOR } from "../../src/shared/clipboard";
import { drawWith } from "../support";
import { openRenderer } from "./support";

const BOX = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };
const NAME = "Poster";

function clipboardTypes(page: Page): Promise<string[]> {
	return page.evaluate(async () => {
		const items = await navigator.clipboard.read();
		return items.flatMap((item) => item.types);
	});
}

async function fileCommand(page: Page, label: string): Promise<void> {
	await page.locator("#file-bar").getByRole("button", { name: "File" }).click();
	await page
		.getByRole("menuitem")
		.filter({ has: page.getByText(label, { exact: true }) })
		.click();
}

test("the website saves a document as a download and opens it again from a file", async ({
	page,
}, testInfo) => {
	const { layers, origin } = await openRenderer(page);
	await drawWith(page, origin, "r", BOX);
	await expect(layers).toHaveCount(2);

	page.once("dialog", (dialog) => dialog.accept(NAME));
	const saved = page.waitForEvent("download");
	await fileCommand(page, "Save");
	const download = await saved;
	expect(download.suggestedFilename()).toBe(`${NAME}.botframe`);
	await expect(page.getByRole("tab", { selected: true })).toHaveText(NAME);

	await page.getByRole("button", { name: "New tab" }).click();
	await expect(layers).toHaveCount(1);
	const chooser = page.waitForEvent("filechooser");
	await fileCommand(page, "Open…");
	const file = testInfo.outputPath(download.suggestedFilename());
	await download.saveAs(file);
	await (await chooser).setFiles(file);

	await expect(page.getByRole("tab")).toHaveText([NAME, "Untitled", NAME]);
	await expect(layers).toHaveCount(2);
});

test("the website saves again under the same name with the key, and asks no name", async ({
	page,
}) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "r", BOX);
	page.once("dialog", (dialog) => dialog.accept(NAME));
	const first = page.waitForEvent("download");
	await page.keyboard.press("ControlOrMeta+s");
	expect((await first).suggestedFilename()).toBe(`${NAME}.botframe`);

	page.on("dialog", () => {
		throw new Error("the second save asked for a name");
	});
	const second = page.waitForEvent("download");
	await page.keyboard.press("ControlOrMeta+s");
	expect((await second).suggestedFilename()).toBe(`${NAME}.botframe`);
});

test("the website copies and pastes layers through the clipboard of the browser", async ({
	page,
	context,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	const { layers, origin } = await openRenderer(page);
	await drawWith(page, origin, "r", BOX);
	await expect(layers).toHaveCount(2);

	await page.keyboard.press("ControlOrMeta+c");
	await expect.poll(() => clipboardTypes(page)).toContain(LAYERS_FLAVOR);
	await page.keyboard.press("ControlOrMeta+v");

	await expect(layers).toHaveCount(3);
});

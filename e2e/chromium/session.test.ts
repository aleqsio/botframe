import { expect, test } from "@playwright/test";
import { drawWith } from "../support";
import { WRITE_WAIT_MS, openRenderer } from "./support";

const BOX = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };

test("a reload brings back each tab, its name, its changes, and the selected tab", async ({
	page,
}) => {
	const { layers, origin } = await openRenderer(page);
	await drawWith(page, origin, "r", BOX);
	await expect(layers).toHaveCount(2);
	await page.locator("#file-bar .file-name").dblclick();
	await page.getByLabel("File name", { exact: true }).fill("Poster");
	await page.keyboard.press("Enter");
	await page.getByRole("button", { name: "New tab" }).click();
	await page.waitForTimeout(WRITE_WAIT_MS);

	await page.reload();

	const tabs = page.getByRole("tab");
	await expect(tabs).toHaveText(["Poster", "Untitled"]);
	await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
	await tabs.nth(0).click();
	await expect(layers).toHaveCount(2);
	await expect(page.locator("#file-bar .file-name")).toHaveText("Poster");
});

test("a reload keeps the link to a saved file, so the next save asks no name", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "r", BOX);
	page.once("dialog", (dialog) => dialog.accept("Poster"));
	const first = page.waitForEvent("download");
	await page.keyboard.press("ControlOrMeta+s");
	await first;
	await page.waitForTimeout(WRITE_WAIT_MS);

	await page.reload();
	await expect(page.getByRole("tab")).toHaveText(["Poster"]);
	page.on("dialog", () => {
		throw new Error("the save after the reload asked for a name");
	});
	const second = page.waitForEvent("download");
	await page.keyboard.press("ControlOrMeta+s");
	expect((await second).suggestedFilename()).toBe("Poster.botframe");
});

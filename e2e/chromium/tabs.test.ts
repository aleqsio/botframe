import { expect, test } from "@playwright/test";
import { drawWith } from "../support";
import { openRenderer } from "./support";

const BOX = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };

test("the New tab button opens an empty Untitled tab, and each tab keeps its own document", async ({
	page,
}) => {
	const { layers, origin } = await openRenderer(page);
	const tabs = page.getByRole("tab");

	await drawWith(page, origin, "r", BOX);
	await expect(layers).toHaveCount(2);

	await page.getByRole("button", { name: "New tab" }).click();

	await expect(tabs).toHaveText(["Untitled", "Untitled"]);
	await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
	await expect(layers).toHaveCount(1);

	await tabs.nth(0).click();
	await expect(layers).toHaveCount(2);
});

test("the close button takes a tab away and selects the tab beside it", async ({ page }) => {
	const { layers } = await openRenderer(page);
	const tabs = page.getByRole("tab");

	await page.getByRole("button", { name: "New tab" }).click();
	await expect(tabs).toHaveCount(2);

	await page.getByRole("button", { name: "Close Untitled" }).nth(1).click();

	await expect(tabs).toHaveCount(1);
	await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
	await expect(layers).toHaveCount(1);
});

test("the close button asks first when the tab has changes", async ({ page }) => {
	const { layers, origin } = await openRenderer(page);
	const close = page.getByRole("button", { name: "Close Untitled" });
	await drawWith(page, origin, "r", BOX);
	await expect(layers).toHaveCount(2);

	page.once("dialog", (dialog) => dialog.dismiss());
	await close.click();
	await expect(layers).toHaveCount(2);

	page.once("dialog", (dialog) => dialog.accept());
	await close.click();
	await expect(page.getByRole("tab")).toHaveCount(1);
	await expect(layers).toHaveCount(1);
});

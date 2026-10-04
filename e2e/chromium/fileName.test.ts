import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { drawWith } from "../support";
import { openRenderer } from "./support";

const BOX = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };

function nameOf(page: Page): ReturnType<Page["locator"]> {
	return page.locator("#file-bar .file-name");
}

function nameInput(page: Page): ReturnType<Page["getByLabel"]> {
	return page.getByLabel("File name", { exact: true });
}

test("a double click on the file name renames the tab, and the first save offers the name", async ({
	page,
}) => {
	await openRenderer(page);
	await nameOf(page).dblclick();
	await nameInput(page).fill("Poster");
	await nameInput(page).press("Enter");

	await expect(nameOf(page)).toHaveText("Poster");
	await expect(page.getByRole("tab", { selected: true })).toHaveText("Poster");

	const offered = new Promise<string>((resolve) => {
		page.once("dialog", (dialog) => {
			resolve(dialog.defaultValue());
			void dialog.dismiss();
		});
	});
	await page.keyboard.press("ControlOrMeta+s");
	expect(await offered).toBe("Poster");
});

test("the context menu of the file name gives Rename, and Escape keeps the old name", async ({
	page,
}) => {
	await openRenderer(page);
	await nameOf(page).click({ button: "right" });
	await page.getByRole("menuitem", { name: "Rename" }).click();
	await expect(nameInput(page)).toBeFocused();
	await nameInput(page).fill("Draft");
	await nameInput(page).press("Escape");

	await expect(nameOf(page)).toHaveText("Untitled");
});

test("a rename of a saved file gives the new name to the next download", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "r", BOX);
	page.once("dialog", (dialog) => dialog.accept("Poster"));
	const first = page.waitForEvent("download");
	await page.keyboard.press("ControlOrMeta+s");
	await first;

	await nameOf(page).dblclick();
	await nameInput(page).fill("Poster final");
	await nameInput(page).press("Enter");
	await expect(nameOf(page)).toHaveText("Poster final");

	const second = page.waitForEvent("download");
	await page.keyboard.press("ControlOrMeta+s");
	expect((await second).suggestedFilename()).toBe("Poster final.botframe");
});

for (const text of ["a/b", "   "]) {
	test(`the name "${text}" keeps the old name`, async ({ page }) => {
		await openRenderer(page);
		await nameOf(page).dblclick();
		await nameInput(page).fill(text);
		await nameInput(page).press("Enter");
		await expect(nameOf(page)).toHaveText("Untitled");
	});
}

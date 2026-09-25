import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { drawWith } from "../support";
import type { Drag } from "../support";
import { openRenderer } from "./support";

const SHAPE: Drag = { from: { x: 280, y: 40 }, to: { x: 380, y: 120 } };
const FRAME: Drag = { from: { x: 440, y: 40 }, to: { x: 600, y: 160 } };

async function expectChildControls(page: Page, frame: boolean): Promise<void> {
	await expect(page.getByLabel("Padding value", { exact: true })).toHaveCount(frame ? 1 : 0);
	await expect(page.getByRole("group", { name: "Display" })).toHaveCount(frame ? 1 : 0);
	const hug = page.getByRole("group", { name: "W size" }).getByRole("button", { name: "Hug" });
	await expect(hug).toBeEnabled({ enabled: frame });
}

for (const key of ["r", "o"]) {
	test(`a shape drawn with ${key} does not show the padding, display, and hug controls`, async ({
		page,
	}) => {
		const { origin } = await openRenderer(page);
		await drawWith(page, origin, key, SHAPE);

		await expect(page.getByLabel("X value", { exact: true })).toBeVisible();
		await expectChildControls(page, false);
	});
}

test("a frame shows the padding, display, and hug controls", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "a", FRAME);

	await expectChildControls(page, true);
});
